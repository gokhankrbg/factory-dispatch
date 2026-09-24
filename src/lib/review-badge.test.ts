import { describe, expect, it } from "vitest";
import { reviewReasonBadge, reviewSuggestionText } from "./review-badge";

describe("reviewReasonBadge", () => {
  it("derives 'Below threshold' from below_confidence_threshold", () => {
    const badge = reviewReasonBadge({
      finalTeam: "human_review",
      reasonCode: "below_confidence_threshold",
      threshold: 0.7,
    });
    expect(badge).toBe("Below threshold");
  });

  it("derives 'Model requested review' from model_requested_review", () => {
    const badge = reviewReasonBadge({
      finalTeam: "human_review",
      reasonCode: "model_requested_review",
      threshold: 0.7,
    });
    expect(badge).toBe("Model requested review");
  });

  it("returns null for a direct_route decision — never fabricates a review reason", () => {
    const badge = reviewReasonBadge({
      finalTeam: "maintenance",
      reasonCode: "direct_route",
      threshold: 0.7,
    });
    expect(badge).toBeNull();
  });
});

describe("reviewSuggestionText", () => {
  it("formats the actual model choice and confidence, never a hardcoded example", () => {
    expect(reviewSuggestionText("maintenance", 0.63)).toBe("Maintenance suggested · 63% confidence");
    expect(reviewSuggestionText("logistics", 0.41)).toBe("Logistics suggested · 41% confidence");
  });
});
