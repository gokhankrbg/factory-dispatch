// Shared types safe to import from both server and client code.

export const TEAM_KEYS = [
  "maintenance",
  "quality",
  "logistics",
  "human_review",
] as const;

export type TeamKey = (typeof TEAM_KEYS)[number];

export const TEAM_LABELS: Record<TeamKey, string> = {
  maintenance: "Maintenance",
  quality: "Quality",
  logistics: "Logistics",
  human_review: "Human Review",
};

/** The model's raw answer to the "which team should assess this first" question. */
export interface ModelAnalysis {
  modelChoice: TeamKey;
  confidence: number;
  probabilities: Record<TeamKey, number>;
  model: string;
  upstreamRoundTripMs: number;
}

export type RoutingReasonCode =
  | "model_requested_review"
  | "below_confidence_threshold"
  | "direct_route";

/** Application-generated explanations for a routing reason code — not model-generated reasoning. */
export const ROUTING_REASON_EXPLANATIONS: Record<RoutingReasonCode, string> = {
  model_requested_review: "The model selected Human Review.",
  below_confidence_threshold: "Model confidence is below the demo review threshold.",
  direct_route: "The model recommendation passed the demo routing threshold.",
};

export interface RoutingDecision {
  finalTeam: TeamKey;
  reasonCode: RoutingReasonCode;
  threshold: number;
}

/** The full application response: the model's analysis plus the deterministic routing decision applied to it. */
export interface AnalyzeResponse extends ModelAnalysis {
  routing: RoutingDecision;
}
