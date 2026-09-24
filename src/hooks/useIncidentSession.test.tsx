// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useIncidentSession, DEMO_PACING_MS } from "./useIncidentSession";

function mockResponse(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    modelChoice: "maintenance",
    confidence: 0.9,
    probabilities: { maintenance: 0.9, quality: 0.04, logistics: 0.03, human_review: 0.03 },
    model: "jev-test",
    upstreamRoundTripMs: 250,
    routing: { finalTeam: "maintenance", reasonCode: "direct_route", threshold: 0.7 },
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("useIncidentSession — live demo pacing and stop behavior", () => {
  it("uses presentation pacing (5000ms) by default between demo results", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(mockResponse()));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useIncidentSession());
    expect(result.current.pacing).toBe("presentation");

    act(() => {
      result.current.runLiveDemo();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEMO_PACING_MS.presentation - 1);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("switches to fast pacing (300ms) when selected while idle", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(mockResponse()));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useIncidentSession());
    act(() => {
      result.current.setPacing("fast");
    });
    expect(result.current.pacing).toBe("fast");

    act(() => {
      result.current.runLiveDemo();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEMO_PACING_MS.fast - 1);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not allow changing pacing while the demo is running", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(mockResponse()));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useIncidentSession());
    act(() => {
      result.current.runLiveDemo();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.demoStatus).toBe("running");

    act(() => {
      result.current.setPacing("fast");
    });
    expect(result.current.pacing).toBe("presentation");
  });

  it("stopping during the display pause prevents the next request from firing", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(mockResponse()));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useIncidentSession());
    act(() => {
      result.current.runLiveDemo();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0); // let the first request resolve and the pause begin
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.stopDemo();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEMO_PACING_MS.presentation + 100);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.demoStatus).toBe("idle");
    expect(result.current.incidents).toHaveLength(1);
  });

  it("stopping during a pending request lets it settle once and schedules nothing further", async () => {
    let resolveFetch: ((response: Response) => void) | null = null;
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useIncidentSession());
    act(() => {
      result.current.runLiveDemo();
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(result.current.demoStatus).toBe("running");

    act(() => {
      result.current.stopDemo();
    });
    expect(result.current.demoStatus).toBe("stopping");

    await act(async () => {
      resolveFetch!(jsonResponse(mockResponse()));
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.demoStatus).toBe("idle"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.incidents).toHaveLength(1);
    expect(result.current.incidents[0].status).toBe("done");
  });

  it("keeps stored API latency unchanged regardless of pacing", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(mockResponse({ upstreamRoundTripMs: 777 })));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useIncidentSession());
    act(() => {
      result.current.setPacing("fast");
    });
    act(() => {
      result.current.runLiveDemo();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.incidents[0].result?.upstreamRoundTripMs).toBe(777);

    act(() => {
      result.current.stopDemo();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEMO_PACING_MS.fast + 10);
    });

    // Still the same measured value — the pause never touches it.
    expect(result.current.incidents[0].result?.upstreamRoundTripMs).toBe(777);
  });

  it("selecting a historical incident does not trigger a new analysis request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(mockResponse()));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useIncidentSession());
    await act(async () => {
      await result.current.submitManual("A report.");
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const incidentId = result.current.incidents[0].id;

    act(() => {
      result.current.selectIncident(incidentId);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.selectedIncident?.id).toBe(incidentId);
    expect(result.current.metrics.analyzed).toBe(1);
  });
});
