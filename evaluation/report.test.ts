import { describe, expect, it } from "vitest";
import { computeMetrics, type CaseResult } from "./metrics";
import { buildJsonReport, buildMarkdownReport, formatMetricsSummary, type RunMetadata } from "./report";

const runMeta: RunMetadata = {
  timestamp: "2026-01-01T00:00:00.000Z",
  group: "development",
  caseCount: 3,
  requestedModel: "jev-latest",
  returnedModelVersions: ["jev-test-model"],
  reviewThreshold: 0.7,
  questionConfigHash: "deadbeef",
  datasetHash: "cafef00d",
};

function success(id: string): CaseResult {
  return {
    id,
    group: "development",
    report: "Report text.",
    expectedModelChoice: "maintenance",
    outcome: {
      status: "success",
      modelChoice: "maintenance",
      confidence: 0.9,
      probabilities: { maintenance: 0.9, quality: 0.05, logistics: 0.03, human_review: 0.02 },
      model: "jev-test-model",
      upstreamRoundTripMs: 321,
      routing: { finalTeam: "maintenance", reasonCode: "direct_route", threshold: 0.7 },
      matchesExpected: true,
    },
  };
}

function failed(id: string): CaseResult {
  return {
    id,
    group: "development",
    report: "Report text.",
    expectedModelChoice: "quality",
    outcome: {
      status: "failed",
      errorStatus: 502,
      errorCode: "upstream_error",
      errorMessage: "Incident analysis service returned an error.",
    },
  };
}

function unattempted(id: string): CaseResult {
  return {
    id,
    group: "development",
    report: "Report text.",
    expectedModelChoice: "logistics",
    outcome: { status: "unattempted" },
  };
}

describe("formatMetricsSummary", () => {
  it("shows N/A for every rate and latency metric when there are no successful cases", () => {
    const metrics = computeMetrics([failed("a")]);
    const lines = formatMetricsSummary(metrics).join("\n");

    expect(lines).toContain("N/A (0 eligible successful cases)");
    expect(lines).toContain("N/A (0 successful cases)");
    expect(lines).not.toMatch(/NaN/);
  });

  it("reports counts and percentages for a mixed run", () => {
    const metrics = computeMetrics([success("a"), failed("b"), unattempted("c")]);
    const lines = formatMetricsSummary(metrics).join("\n");

    expect(lines).toContain("Attempted: 2 · Successful: 1 · Failed: 1 · Unattempted: 1");
    expect(lines).toContain("Model-choice agreement (among successful): 1/1 (100%)");
  });
});

describe("buildJsonReport", () => {
  it("bundles run metadata, metrics, and every result including unattempted ones", () => {
    const results = [success("a"), failed("b"), unattempted("c")];
    const metrics = computeMetrics(results);
    const report = buildJsonReport(runMeta, results, metrics);

    expect(report.runMeta).toBe(runMeta);
    expect(report.results).toHaveLength(3);
    expect(report.results[2].outcome.status).toBe("unattempted");
    expect(report.metrics.unattempted).toBe(1);
  });
});

describe("buildMarkdownReport", () => {
  it("renders a case-by-case row for successful, failed, and unattempted cases without throwing", () => {
    const results = [success("a"), failed("b"), unattempted("c")];
    const metrics = computeMetrics(results);
    const markdown = buildMarkdownReport(runMeta, results, metrics);

    expect(markdown).toContain("| a |");
    expect(markdown).toContain("| b |");
    expect(markdown).toContain("| c |");
    expect(markdown).toContain("unattempted (run stopped early)");
    expect(markdown).toContain("failed (502 upstream_error");
    expect(markdown).toContain("Holdout cases must stay unchanged during tuning");
    expect(markdown).not.toMatch(/NaN/);
  });

  it("renders N/A metrics cleanly when nothing succeeded (fully failed run)", () => {
    const results = [failed("a"), failed("b")];
    const metrics = computeMetrics(results);
    const markdown = buildMarkdownReport(runMeta, results, metrics);

    expect(markdown).toContain("N/A (0 successful cases)");
    expect(markdown).not.toMatch(/NaN/);
  });
});
