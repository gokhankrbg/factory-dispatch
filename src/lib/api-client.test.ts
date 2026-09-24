import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, requestAnalysis } from "./api-client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("requestAnalysis", () => {
  it("posts the report and returns the parsed response on success", async () => {
    const body = {
      modelChoice: "maintenance",
      confidence: 0.9,
      probabilities: { maintenance: 0.9, quality: 0.04, logistics: 0.03, human_review: 0.03 },
      model: "jev-test",
      upstreamRoundTripMs: 123,
      routing: { finalTeam: "maintenance", reasonCode: "direct_route", threshold: 0.7 },
    };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestAnalysis("Some report.");

    expect(result).toEqual(body);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/analyze",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ report: "Some report." }),
      }),
    );
  });

  it("throws the server's safe error message on failure", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ error: "Report cannot be empty." }), { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(requestAnalysis("")).rejects.toThrow("Report cannot be empty.");
    await expect(requestAnalysis("")).rejects.toBeInstanceOf(ApiError);
  });

  it("falls back to a generic message when the error body is unreadable", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("not json", { status: 502 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(requestAnalysis("Some report.")).rejects.toThrow(
      "The server returned an unreadable response.",
    );
  });
});
