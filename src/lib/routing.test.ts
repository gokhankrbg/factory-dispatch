import { describe, expect, it } from "vitest";
import { REVIEW_CONFIDENCE_THRESHOLD, decideRouting } from "./routing";

describe("decideRouting", () => {
  it("routes directly to a clear team when confidence is above the threshold", () => {
    const result = decideRouting("maintenance", 0.85);
    expect(result).toEqual({
      finalTeam: "maintenance",
      reasonCode: "direct_route",
      threshold: REVIEW_CONFIDENCE_THRESHOLD,
    });
  });

  it("sends a clear team to Human Review when confidence is below the threshold, preserving the model choice", () => {
    const result = decideRouting("quality", 0.5);
    expect(result.finalTeam).toBe("human_review");
    expect(result.reasonCode).toBe("below_confidence_threshold");
  });

  it("treats confidence exactly equal to the threshold as a direct route", () => {
    const result = decideRouting("logistics", REVIEW_CONFIDENCE_THRESHOLD);
    expect(result).toEqual({
      finalTeam: "logistics",
      reasonCode: "direct_route",
      threshold: REVIEW_CONFIDENCE_THRESHOLD,
    });
  });

  it("keeps a model-selected human_review as human_review at low confidence", () => {
    const result = decideRouting("human_review", 0.1);
    expect(result).toEqual({
      finalTeam: "human_review",
      reasonCode: "model_requested_review",
      threshold: REVIEW_CONFIDENCE_THRESHOLD,
    });
  });

  it("keeps a model-selected human_review as human_review at high confidence", () => {
    const result = decideRouting("human_review", 0.99);
    expect(result).toEqual({
      finalTeam: "human_review",
      reasonCode: "model_requested_review",
      threshold: REVIEW_CONFIDENCE_THRESHOLD,
    });
  });
});
