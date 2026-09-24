import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function upstreamSuccess(choice: string, confidence: number) {
  const others = ["maintenance", "quality", "logistics", "human_review"].filter(
    (key) => key !== choice,
  );
  const remainder = 1 - confidence;
  const probabilities: Record<string, number> = { [choice]: confidence };
  others.forEach((key, index) => {
    probabilities[key] = index === others.length - 1
      ? remainder - (remainder / others.length) * (others.length - 1)
      : remainder / others.length;
  });

  return new Response(
    JSON.stringify({
      model: "jev-test-2026-01-01",
      answers: {
        team: {
          type: "choice",
          choice,
          confidence,
          probabilities,
        },
      },
    }),
    { status: 200 },
  );
}

describe("POST /api/analyze", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("TYPESAFE_API_KEY", "test-key");
    vi.stubEnv("TYPESAFE_MODEL", "jev-test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("rejects an empty report before calling the upstream service", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("./route");

    const response = await POST(jsonRequest({ report: "   " }));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a report over 2000 characters before calling the upstream service", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("./route");

    const response = await POST(jsonRequest({ report: "a".repeat(2001) }));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON bodies before calling the upstream service", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("./route");

    const request = new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not valid json",
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps a successful upstream response and routes directly above threshold", async () => {
    const fetchMock = vi.fn().mockResolvedValue(upstreamSuccess("maintenance", 0.82));
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("./route");

    const response = await POST(
      jsonRequest({ report: "Conveyor grinding noise near the drive motor." }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.modelChoice).toBe("maintenance");
    expect(data.confidence).toBe(0.82);
    expect(data.model).toBe("jev-test-2026-01-01");
    expect(typeof data.upstreamRoundTripMs).toBe("number");
    expect(data.routing).toEqual({
      finalTeam: "maintenance",
      reasonCode: "direct_route",
      threshold: 0.7,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("routes to human_review when confidence is below threshold, preserving the model choice", async () => {
    const fetchMock = vi.fn().mockResolvedValue(upstreamSuccess("quality", 0.5));
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("./route");

    const response = await POST(jsonRequest({ report: "Something happened." }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.modelChoice).toBe("quality");
    expect(data.confidence).toBe(0.5);
    expect(data.routing).toEqual({
      finalTeam: "human_review",
      reasonCode: "below_confidence_threshold",
      threshold: 0.7,
    });
  });

  it("routes directly when confidence is exactly at the threshold", async () => {
    const fetchMock = vi.fn().mockResolvedValue(upstreamSuccess("logistics", 0.7));
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("./route");

    const response = await POST(jsonRequest({ report: "Something happened." }));
    const data = await response.json();

    expect(data.routing.finalTeam).toBe("logistics");
    expect(data.routing.reasonCode).toBe("direct_route");
  });

  it("keeps a model-selected human_review as human_review at low confidence", async () => {
    const fetchMock = vi.fn().mockResolvedValue(upstreamSuccess("human_review", 0.3));
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("./route");

    const response = await POST(jsonRequest({ report: "Something happened." }));
    const data = await response.json();

    expect(data.modelChoice).toBe("human_review");
    expect(data.routing).toEqual({
      finalTeam: "human_review",
      reasonCode: "model_requested_review",
      threshold: 0.7,
    });
  });

  it("keeps a model-selected human_review as human_review at high confidence", async () => {
    const fetchMock = vi.fn().mockResolvedValue(upstreamSuccess("human_review", 0.95));
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("./route");

    const response = await POST(jsonRequest({ report: "Something happened." }));
    const data = await response.json();

    expect(data.routing).toEqual({
      finalTeam: "human_review",
      reasonCode: "model_requested_review",
      threshold: 0.7,
    });
  });

  it("rejects a malformed upstream response instead of inventing defaults", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ model: "jev-test", answers: {} }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("./route");

    const response = await POST(jsonRequest({ report: "Something happened." }));
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(typeof data.error).toBe("string");
    expect(data.routing).toBeUndefined();
  });

  it("rejects an upstream response whose probabilities do not sum to 1", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          model: "jev-test",
          answers: {
            team: {
              type: "choice",
              choice: "maintenance",
              confidence: 0.9,
              probabilities: {
                maintenance: 0.9,
                quality: 0.9,
                logistics: 0,
                human_review: 0,
              },
            },
          },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("./route");

    const response = await POST(jsonRequest({ report: "Something happened." }));

    expect(response.status).toBe(502);
  });

  it("returns 429 when the provider rate-limits the request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("./route");

    const response = await POST(jsonRequest({ report: "Something happened." }));

    expect(response.status).toBe(429);
  });

  it("returns 502 on provider authentication failure without leaking details, and does not fabricate a routing decision", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ secret: "should never leak" }), { status: 401 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("./route");

    const response = await POST(jsonRequest({ report: "Something happened." }));
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(JSON.stringify(data)).not.toContain("should never leak");
    expect(data.routing).toBeUndefined();
  });

  it("returns 504 when the upstream request times out", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const error = new Error("Aborted");
          error.name = "AbortError";
          reject(error);
        });
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("./route");

    const responsePromise = POST(jsonRequest({ report: "Something happened." }));
    await vi.advanceTimersByTimeAsync(15_000);
    const response = await responsePromise;

    expect(response.status).toBe(504);
  });

  it("returns 500 when the server is missing its API key configuration", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("TYPESAFE_MODEL", "jev-test");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("./route");

    const response = await POST(jsonRequest({ report: "Something happened." }));

    expect(response.status).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
