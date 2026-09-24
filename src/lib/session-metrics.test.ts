import { describe, expect, it } from "vitest";
import { computeSessionMetrics, groupIncidentsByFinalTeam } from "./session-metrics";
import type { Incident } from "./incident-reducer";
import type { AnalyzeResponse } from "./types";

function doneIncident(
  id: string,
  finalTeam: AnalyzeResponse["routing"]["finalTeam"],
  upstreamRoundTripMs: number,
): Incident {
  return {
    id,
    report: "Report",
    source: "manual",
    status: "done",
    createdAt: 0,
    result: {
      modelChoice: finalTeam === "human_review" ? "quality" : finalTeam,
      confidence: 0.8,
      probabilities: { maintenance: 0.25, quality: 0.25, logistics: 0.25, human_review: 0.25 },
      model: "jev-test",
      upstreamRoundTripMs,
      routing: {
        finalTeam,
        reasonCode: finalTeam === "human_review" ? "below_confidence_threshold" : "direct_route",
        threshold: 0.7,
      },
    },
  };
}

function analyzingIncident(id: string): Incident {
  return { id, report: "Report", source: "manual", status: "analyzing", createdAt: 0 };
}

function failedIncident(id: string): Incident {
  return { id, report: "Report", source: "manual", status: "failed", createdAt: 0, error: "Failed." };
}

describe("computeSessionMetrics", () => {
  it("shows zero counts and null latency before any successful result", () => {
    const metrics = computeSessionMetrics([]);
    expect(metrics).toEqual({ analyzed: 0, autoRouted: 0, sentToReview: 0, medianRoundTripMs: null });
  });

  it("ignores analyzing and failed incidents entirely", () => {
    const metrics = computeSessionMetrics([analyzingIncident("a"), failedIncident("b")]);
    expect(metrics.analyzed).toBe(0);
    expect(metrics.medianRoundTripMs).toBeNull();
  });

  it("counts analyzed, auto-routed, and sent-to-review only from successful results", () => {
    const metrics = computeSessionMetrics([
      doneIncident("a", "maintenance", 100),
      doneIncident("b", "human_review", 200),
      analyzingIncident("c"),
      failedIncident("d"),
    ]);
    expect(metrics.analyzed).toBe(2);
    expect(metrics.autoRouted).toBe(1);
    expect(metrics.sentToReview).toBe(1);
  });

  it("computes the median API round-trip across successful cases", () => {
    const metrics = computeSessionMetrics([
      doneIncident("a", "maintenance", 100),
      doneIncident("b", "quality", 300),
      doneIncident("c", "logistics", 200),
    ]);
    expect(metrics.medianRoundTripMs).toBe(200);
  });
});

describe("groupIncidentsByFinalTeam", () => {
  it("places every successful incident in exactly one team's queue", () => {
    const groups = groupIncidentsByFinalTeam([
      doneIncident("a", "maintenance", 100),
      doneIncident("b", "human_review", 200),
      analyzingIncident("c"),
    ]);
    expect(groups.maintenance).toHaveLength(1);
    expect(groups.human_review).toHaveLength(1);
    expect(groups.quality).toHaveLength(0);
    expect(groups.logistics).toHaveLength(0);
  });
});
