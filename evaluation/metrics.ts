// Pure metric calculations over a completed (possibly partial) evaluation
// run. No I/O and no network calls here, so this is safe and cheap to unit
// test with synthetic data.

import type { RoutingDecision, TeamKey } from "@/lib/types";
import type { EvaluationGroup } from "./dataset";

export type CaseOutcome =
  | {
      status: "success";
      modelChoice: TeamKey;
      confidence: number;
      probabilities: Record<TeamKey, number>;
      model: string;
      upstreamRoundTripMs: number;
      routing: RoutingDecision;
      matchesExpected: boolean;
    }
  | {
      status: "failed";
      errorStatus: number;
      errorCode: string;
      errorMessage: string;
    }
  | { status: "unattempted" };

export interface CaseResult {
  id: string;
  group: EvaluationGroup;
  report: string;
  expectedModelChoice: TeamKey;
  outcome: CaseOutcome;
}

/** A count over an eligible subset, with the rate left `null` when there are no eligible cases. */
export interface RateMetric {
  count: number;
  of: number;
  rate: number | null;
}

export interface LatencyMetric {
  n: number;
  medianMs: number | null;
  p95Ms: number | null;
}

export interface EvaluationMetrics {
  totalCases: number;
  attempted: number;
  successful: number;
  failed: number;
  unattempted: number;
  /** Among successful cases: modelChoice === expectedModelChoice. */
  modelChoiceAgreement: RateMetric;
  /** Among successful cases: share whose final team is human_review, for any reason. */
  humanReviewShare: RateMetric;
  /** Among successful cases: share automatically routed (reasonCode === "direct_route"), i.e. not sent to Human Review. */
  autoRoutingCoverage: RateMetric;
  /** Among automatically routed cases only: finalTeam === expectedModelChoice. */
  finalTeamAgreementAmongAutoRouted: RateMetric;
  /** Among successful cases whose expected label is human_review: how many were instead auto-routed to a working team. */
  incorrectlyAutoRoutedExpectedHumanReview: RateMetric;
  /** upstreamRoundTripMs across successful cases only — API round-trip, not pure model inference time. */
  latency: LatencyMetric;
}

function rate(count: number, of: number): RateMetric {
  return { count, of, rate: of === 0 ? null : count / of };
}

function median(sortedAscending: number[]): number {
  const n = sortedAscending.length;
  const mid = Math.floor(n / 2);
  return n % 2 === 0
    ? (sortedAscending[mid - 1] + sortedAscending[mid]) / 2
    : sortedAscending[mid];
}

/** Nearest-rank percentile (1-indexed), descriptive of this sample only — not a stable production estimate. */
function nearestRankPercentile(sortedAscending: number[], percentile: number): number {
  const rank = Math.ceil((percentile / 100) * sortedAscending.length);
  const index = Math.min(Math.max(rank, 1), sortedAscending.length) - 1;
  return sortedAscending[index];
}

export function computeMetrics(results: CaseResult[]): EvaluationMetrics {
  const successes = results.filter(
    (r): r is CaseResult & { outcome: Extract<CaseOutcome, { status: "success" }> } =>
      r.outcome.status === "success",
  );
  const failures = results.filter((r) => r.outcome.status === "failed");
  const unattempted = results.filter((r) => r.outcome.status === "unattempted");

  const modelChoiceMatches = successes.filter((r) => r.outcome.matchesExpected).length;
  const humanReviewCount = successes.filter(
    (r) => r.outcome.routing.finalTeam === "human_review",
  ).length;
  const autoRouted = successes.filter((r) => r.outcome.routing.reasonCode === "direct_route");
  const autoRoutedMatches = autoRouted.filter(
    (r) => r.outcome.routing.finalTeam === r.expectedModelChoice,
  ).length;

  const expectedHumanReviewSuccesses = successes.filter(
    (r) => r.expectedModelChoice === "human_review",
  );
  const incorrectlyAutoRouted = expectedHumanReviewSuccesses.filter(
    (r) => r.outcome.routing.reasonCode === "direct_route",
  ).length;

  const latencies = successes.map((r) => r.outcome.upstreamRoundTripMs).sort((a, b) => a - b);

  return {
    totalCases: results.length,
    attempted: successes.length + failures.length,
    successful: successes.length,
    failed: failures.length,
    unattempted: unattempted.length,
    modelChoiceAgreement: rate(modelChoiceMatches, successes.length),
    humanReviewShare: rate(humanReviewCount, successes.length),
    autoRoutingCoverage: rate(autoRouted.length, successes.length),
    finalTeamAgreementAmongAutoRouted: rate(autoRoutedMatches, autoRouted.length),
    incorrectlyAutoRoutedExpectedHumanReview: rate(
      incorrectlyAutoRouted,
      expectedHumanReviewSuccesses.length,
    ),
    latency: {
      n: latencies.length,
      medianMs: latencies.length ? median(latencies) : null,
      p95Ms: latencies.length ? nearestRankPercentile(latencies, 95) : null,
    },
  };
}
