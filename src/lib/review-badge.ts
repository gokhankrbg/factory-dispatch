// Pure derivation of the compact Human Review badge text from a stored
// routing decision. Never infers a cause the routing decision didn't
// actually record, and never labels Human Review as an emergency.

import { TEAM_LABELS, type RoutingDecision, type TeamKey } from "@/lib/types";

const REVIEW_REASON_BADGES: Record<"below_confidence_threshold" | "model_requested_review", string> = {
  below_confidence_threshold: "Below threshold",
  model_requested_review: "Model requested review",
};

/** Only meaningful for a routing decision whose finalTeam is human_review. */
export function reviewReasonBadge(routing: RoutingDecision): string | null {
  if (routing.reasonCode === "direct_route") return null;
  return REVIEW_REASON_BADGES[routing.reasonCode];
}

/** e.g. "Maintenance suggested · 63% confidence" — only shown for the below-threshold reason. */
export function reviewSuggestionText(modelChoice: TeamKey, confidence: number): string {
  return `${TEAM_LABELS[modelChoice]} suggested · ${(confidence * 100).toFixed(0)}% confidence`;
}
