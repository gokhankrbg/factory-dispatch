// Deterministic application routing policy, applied on the server after the
// model has answered. Pure and separate from the Jev API call so it stays
// easy to test and reason about independently.

import type { RoutingDecision, RoutingReasonCode, TeamKey } from "@/lib/types";

/**
 * Below this confidence, a non-review model choice is routed to Human
 * Review instead. This is an initial, unvalidated demo setting — not a
 * proven safety threshold.
 */
export const REVIEW_CONFIDENCE_THRESHOLD = 0.7;

export function decideRouting(modelChoice: TeamKey, confidence: number): RoutingDecision {
  let finalTeam: TeamKey;
  let reasonCode: RoutingReasonCode;

  if (modelChoice === "human_review") {
    finalTeam = "human_review";
    reasonCode = "model_requested_review";
  } else if (confidence < REVIEW_CONFIDENCE_THRESHOLD) {
    finalTeam = "human_review";
    reasonCode = "below_confidence_threshold";
  } else {
    finalTeam = modelChoice;
    reasonCode = "direct_route";
  }

  return { finalTeam, reasonCode, threshold: REVIEW_CONFIDENCE_THRESHOLD };
}
