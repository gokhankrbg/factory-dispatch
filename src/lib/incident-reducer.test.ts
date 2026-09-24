import { describe, expect, it } from "vitest";
import { applyIncidentEvent, type Incident } from "./incident-reducer";
import type { AnalyzeResponse } from "./types";

const sampleResult: AnalyzeResponse = {
  modelChoice: "maintenance",
  confidence: 0.9,
  probabilities: { maintenance: 0.9, quality: 0.04, logistics: 0.03, human_review: 0.03 },
  model: "jev-test",
  upstreamRoundTripMs: 250,
  routing: { finalTeam: "maintenance", reasonCode: "direct_route", threshold: 0.7 },
};

describe("applyIncidentEvent", () => {
  it("a single successful submission produces exactly one incident", () => {
    let incidents: Incident[] = [];
    incidents = applyIncidentEvent(incidents, {
      type: "started",
      id: "a",
      report: "Report text",
      source: "manual",
      createdAt: 0,
    });
    incidents = applyIncidentEvent(incidents, { type: "succeeded", id: "a", result: sampleResult });

    expect(incidents).toHaveLength(1);
    expect(incidents[0]).toMatchObject({ id: "a", status: "done", result: sampleResult });
  });

  it("'started' always appends, never replaces an existing incident", () => {
    let incidents: Incident[] = [];
    incidents = applyIncidentEvent(incidents, {
      type: "started",
      id: "a",
      report: "First",
      source: "manual",
      createdAt: 0,
    });
    incidents = applyIncidentEvent(incidents, {
      type: "started",
      id: "b",
      report: "Second",
      source: "demo",
      createdAt: 1,
    });

    expect(incidents).toHaveLength(2);
    expect(incidents.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("'succeeded' updates only the matching incident in place, without duplicating it", () => {
    let incidents: Incident[] = [];
    incidents = applyIncidentEvent(incidents, {
      type: "started",
      id: "a",
      report: "Report",
      source: "manual",
      createdAt: 0,
    });
    incidents = applyIncidentEvent(incidents, {
      type: "started",
      id: "b",
      report: "Other report",
      source: "manual",
      createdAt: 1,
    });
    incidents = applyIncidentEvent(incidents, { type: "succeeded", id: "a", result: sampleResult });

    expect(incidents).toHaveLength(2);
    expect(incidents.find((i) => i.id === "a")).toMatchObject({ status: "done" });
    expect(incidents.find((i) => i.id === "b")).toMatchObject({ status: "analyzing" });
  });

  it("'failed' marks the matching incident as failed with a safe error message", () => {
    let incidents: Incident[] = [];
    incidents = applyIncidentEvent(incidents, {
      type: "started",
      id: "a",
      report: "Report",
      source: "manual",
      createdAt: 0,
    });
    incidents = applyIncidentEvent(incidents, { type: "failed", id: "a", error: "Analysis failed." });

    expect(incidents).toHaveLength(1);
    expect(incidents[0]).toMatchObject({ status: "failed", error: "Analysis failed." });
  });

  it("a rerun with a fresh id creates a new incident instead of overwriting the previous one", () => {
    let incidents: Incident[] = [];
    incidents = applyIncidentEvent(incidents, {
      type: "started",
      id: "run-1",
      report: "Report",
      source: "demo",
      createdAt: 0,
    });
    incidents = applyIncidentEvent(incidents, { type: "succeeded", id: "run-1", result: sampleResult });
    incidents = applyIncidentEvent(incidents, {
      type: "started",
      id: "run-2",
      report: "Report",
      source: "demo",
      createdAt: 1,
    });

    expect(incidents).toHaveLength(2);
    expect(incidents[0].id).toBe("run-1");
    expect(incidents[1]).toMatchObject({ id: "run-2", status: "analyzing" });
  });
});
