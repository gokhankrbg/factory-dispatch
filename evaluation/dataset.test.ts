import { describe, expect, it } from "vitest";
import { TEAM_KEYS } from "@/lib/types";
import { EVALUATION_DATASET } from "./dataset";

describe("evaluation dataset", () => {
  it("has exactly 24 cases", () => {
    expect(EVALUATION_DATASET.length).toBe(24);
  });

  it("has unique ids", () => {
    const ids = EVALUATION_DATASET.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has exactly 12 development and 12 holdout cases", () => {
    const development = EVALUATION_DATASET.filter((c) => c.group === "development");
    const holdout = EVALUATION_DATASET.filter((c) => c.group === "holdout");
    expect(development.length).toBe(12);
    expect(holdout.length).toBe(12);
  });

  it("has exactly 3 cases per expected team within each group", () => {
    for (const group of ["development", "holdout"] as const) {
      for (const key of TEAM_KEYS) {
        const count = EVALUATION_DATASET.filter(
          (c) => c.group === group && c.expectedModelChoice === key,
        ).length;
        expect(count).toBe(3);
      }
    }
  });

  it("gives every case a non-empty report and rationale", () => {
    for (const evaluationCase of EVALUATION_DATASET) {
      expect(evaluationCase.report.trim().length).toBeGreaterThan(0);
      expect(evaluationCase.rationale.trim().length).toBeGreaterThan(0);
    }
  });

  it("has no exact duplicate report text across cases", () => {
    const reports = EVALUATION_DATASET.map((c) => c.report.trim().toLowerCase());
    expect(new Set(reports).size).toBe(reports.length);
  });
});
