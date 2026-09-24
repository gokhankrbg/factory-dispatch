import { describe, expect, it } from "vitest";
import { computeMetrics, type CaseResult } from "./metrics";

function success(
  overrides: Partial<{
    id: string;
    expectedModelChoice: CaseResult["expectedModelChoice"];
    modelChoice: CaseResult["expectedModelChoice"];
    finalTeam: CaseResult["expectedModelChoice"];
    reasonCode: "model_requested_review" | "below_confidence_threshold" | "direct_route";
    confidence: number;
    upstreamRoundTripMs: number;
  }> = {},
): CaseResult {
  const modelChoice = overrides.modelChoice ?? "maintenance";
  const finalTeam = overrides.finalTeam ?? modelChoice;
  const reasonCode = overrides.reasonCode ?? "direct_route";
  return {
    id: overrides.id ?? "case-1",
    group: "development",
    report: "Some report.",
    expectedModelChoice: overrides.expectedModelChoice ?? "maintenance",
    outcome: {
      status: "success",
      modelChoice,
      confidence: overrides.confidence ?? 0.9,
      probabilities: { maintenance: 0.9, quality: 0.05, logistics: 0.03, human_review: 0.02 },
      model: "jev-test-model",
      upstreamRoundTripMs: overrides.upstreamRoundTripMs ?? 500,
      routing: { finalTeam, reasonCode, threshold: 0.7 },
      matchesExpected: modelChoice === (overrides.expectedModelChoice ?? "maintenance"),
    },
  };
}

function failed(id: string, errorCode = "upstream_error"): CaseResult {
  return {
    id,
    group: "development",
    report: "Some report.",
    expectedModelChoice: "maintenance",
    outcome: { status: "failed", errorStatus: 502, errorCode, errorMessage: "Upstream failed." },
  };
}

function unattempted(id: string): CaseResult {
  return {
    id,
    group: "development",
    report: "Some report.",
    expectedModelChoice: "maintenance",
    outcome: { status: "unattempted" },
  };
}

describe("computeMetrics", () => {
  it("reports N/A (null rate) for every metric when there are zero successful cases", () => {
    const metrics = computeMetrics([failed("a"), failed("b")]);

    expect(metrics.totalCases).toBe(2);
    expect(metrics.attempted).toBe(2);
    expect(metrics.successful).toBe(0);
    expect(metrics.failed).toBe(2);
    expect(metrics.unattempted).toBe(0);
    expect(metrics.modelChoiceAgreement).toEqual({ count: 0, of: 0, rate: null });
    expect(metrics.humanReviewShare).toEqual({ count: 0, of: 0, rate: null });
    expect(metrics.autoRoutingCoverage).toEqual({ count: 0, of: 0, rate: null });
    expect(metrics.finalTeamAgreementAmongAutoRouted).toEqual({ count: 0, of: 0, rate: null });
    expect(metrics.incorrectlyAutoRoutedExpectedHumanReview).toEqual({ count: 0, of: 0, rate: null });
    expect(metrics.latency).toEqual({ n: 0, medianMs: null, p95Ms: null });
  });

  it("reports an empty dataset as all-zero counts with no division by zero", () => {
    const metrics = computeMetrics([]);
    expect(metrics.totalCases).toBe(0);
    expect(metrics.modelChoiceAgreement.rate).toBeNull();
  });

  it("counts unattempted cases from a partial run separately from failures", () => {
    const metrics = computeMetrics([success(), failed("b"), unattempted("c"), unattempted("d")]);
    expect(metrics.totalCases).toBe(4);
    expect(metrics.attempted).toBe(2);
    expect(metrics.successful).toBe(1);
    expect(metrics.failed).toBe(1);
    expect(metrics.unattempted).toBe(2);
  });

  it("computes model-choice agreement only among successful cases", () => {
    const metrics = computeMetrics([
      success({ expectedModelChoice: "maintenance", modelChoice: "maintenance" }),
      success({ expectedModelChoice: "quality", modelChoice: "logistics" }),
      failed("f"),
    ]);
    expect(metrics.modelChoiceAgreement).toEqual({ count: 1, of: 2, rate: 0.5 });
  });

  it("computes human review share, auto-routing coverage, and final-team agreement together", () => {
    const metrics = computeMetrics([
      // direct route, correct
      success({
        id: "a",
        expectedModelChoice: "maintenance",
        modelChoice: "maintenance",
        finalTeam: "maintenance",
        reasonCode: "direct_route",
      }),
      // below threshold -> human_review, model choice preserved
      success({
        id: "b",
        expectedModelChoice: "quality",
        modelChoice: "quality",
        finalTeam: "human_review",
        reasonCode: "below_confidence_threshold",
      }),
      // model itself picked human_review
      success({
        id: "c",
        expectedModelChoice: "human_review",
        modelChoice: "human_review",
        finalTeam: "human_review",
        reasonCode: "model_requested_review",
      }),
      // direct route, wrong final team vs. expected
      success({
        id: "d",
        expectedModelChoice: "logistics",
        modelChoice: "maintenance",
        finalTeam: "maintenance",
        reasonCode: "direct_route",
      }),
    ]);

    expect(metrics.successful).toBe(4);
    expect(metrics.humanReviewShare).toEqual({ count: 2, of: 4, rate: 0.5 });
    expect(metrics.autoRoutingCoverage).toEqual({ count: 2, of: 4, rate: 0.5 });
    // Among the 2 auto-routed cases (a, d): a matches expected, d does not.
    expect(metrics.finalTeamAgreementAmongAutoRouted).toEqual({ count: 1, of: 2, rate: 0.5 });
  });

  it("flags expected-human_review cases that were incorrectly auto-routed to a working team", () => {
    const metrics = computeMetrics([
      success({
        id: "a",
        expectedModelChoice: "human_review",
        modelChoice: "maintenance",
        finalTeam: "maintenance",
        reasonCode: "direct_route",
      }),
      success({
        id: "b",
        expectedModelChoice: "human_review",
        modelChoice: "human_review",
        finalTeam: "human_review",
        reasonCode: "model_requested_review",
      }),
    ]);

    expect(metrics.incorrectlyAutoRoutedExpectedHumanReview).toEqual({ count: 1, of: 2, rate: 0.5 });
  });

  it("computes median and nearest-rank p95 latency across successful cases only", () => {
    const metrics = computeMetrics([
      success({ id: "a", upstreamRoundTripMs: 100 }),
      success({ id: "b", upstreamRoundTripMs: 200 }),
      success({ id: "c", upstreamRoundTripMs: 300 }),
      success({ id: "d", upstreamRoundTripMs: 400 }),
      failed("e"),
    ]);

    expect(metrics.latency.n).toBe(4);
    expect(metrics.latency.medianMs).toBe(250);
    // nearest-rank p95 of [100,200,300,400]: rank = ceil(0.95*4) = 4 -> index 3 -> 400
    expect(metrics.latency.p95Ms).toBe(400);
  });
});
