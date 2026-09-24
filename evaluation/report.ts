// Builds the JSON and Markdown evaluation reports from a completed run.
// Pure formatting only — no I/O, so it is unit-testable with synthetic data.

import { TEAM_LABELS } from "@/lib/types";
import type { EvaluationGroup } from "./dataset";
import type { CaseResult, EvaluationMetrics, RateMetric } from "./metrics";

export interface RunMetadata {
  timestamp: string;
  group: EvaluationGroup;
  caseCount: number;
  requestedModel: string;
  returnedModelVersions: string[];
  reviewThreshold: number;
  questionConfigHash: string;
  datasetHash: string;
}

export interface JsonReport {
  runMeta: RunMetadata;
  metrics: EvaluationMetrics;
  results: CaseResult[];
}

export function buildJsonReport(
  runMeta: RunMetadata,
  results: CaseResult[],
  metrics: EvaluationMetrics,
): JsonReport {
  return { runMeta, metrics, results };
}

function formatRate(metric: RateMetric, label: string): string {
  if (metric.of === 0) return `N/A (0 eligible ${label})`;
  const pct = ((metric.rate ?? 0) * 100).toFixed(0);
  return `${metric.count}/${metric.of} (${pct}%)`;
}

function formatLatency(metrics: EvaluationMetrics): string {
  if (metrics.latency.n === 0) return "N/A (0 successful cases)";
  return (
    `median ${metrics.latency.medianMs!.toFixed(0)} ms, ` +
    `p95 ${metrics.latency.p95Ms!.toFixed(0)} ms ` +
    `(n=${metrics.latency.n}; descriptive of this small sample, not a stable production estimate)`
  );
}

export function formatMetricsSummary(metrics: EvaluationMetrics): string[] {
  return [
    `Total cases: ${metrics.totalCases}`,
    `Attempted: ${metrics.attempted} · Successful: ${metrics.successful} · Failed: ${metrics.failed} · Unattempted: ${metrics.unattempted}`,
    `Model-choice agreement (among successful): ${formatRate(metrics.modelChoiceAgreement, "successful cases")}`,
    `Human Review share (among successful): ${formatRate(metrics.humanReviewShare, "successful cases")}`,
    `Auto-routing coverage (among successful): ${formatRate(metrics.autoRoutingCoverage, "successful cases")}`,
    `Final-team agreement among auto-routed cases: ${formatRate(metrics.finalTeamAgreementAmongAutoRouted, "auto-routed cases")}`,
    `Expected-Human-Review cases incorrectly auto-routed: ${formatRate(metrics.incorrectlyAutoRoutedExpectedHumanReview, "expected Human Review cases")}`,
    `API round-trip latency (successful cases only, not pure model inference time): ${formatLatency(metrics)}`,
  ];
}

function caseRow(result: CaseResult): string {
  const expected = TEAM_LABELS[result.expectedModelChoice];
  if (result.outcome.status === "success") {
    const o = result.outcome;
    return [
      result.id,
      result.group,
      expected,
      TEAM_LABELS[o.modelChoice],
      `${(o.confidence * 100).toFixed(0)}%`,
      TEAM_LABELS[o.routing.finalTeam],
      o.routing.reasonCode,
      o.matchesExpected ? "yes" : "no",
      `${o.upstreamRoundTripMs}`,
      o.model,
    ].join(" | ");
  }
  if (result.outcome.status === "failed") {
    return [
      result.id,
      result.group,
      expected,
      "—",
      "—",
      "—",
      "—",
      "—",
      "—",
      "—",
      `failed (${result.outcome.errorStatus} ${result.outcome.errorCode}: ${result.outcome.errorMessage})`,
    ].join(" | ");
  }
  return [
    result.id,
    result.group,
    expected,
    "—",
    "—",
    "—",
    "—",
    "—",
    "—",
    "—",
    "unattempted (run stopped early)",
  ].join(" | ");
}

export function buildMarkdownReport(
  runMeta: RunMetadata,
  results: CaseResult[],
  metrics: EvaluationMetrics,
): string {
  const lines: string[] = [];

  lines.push(`# Factory Dispatch evaluation run — ${runMeta.group}`);
  lines.push("");
  lines.push(
    "This is a smoke evaluation over a 24-case synthetic dataset, not industrial validation. " +
      "Development cases may inform later revisions to the question, criteria, or threshold. " +
      "Holdout cases must stay unchanged during tuning — once a holdout run has informed a change, " +
      "it is no longer an untouched final check and a fresh holdout set would be needed for that.",
  );
  lines.push("");

  lines.push("## Run metadata");
  lines.push("");
  lines.push(`- Timestamp: ${runMeta.timestamp}`);
  lines.push(`- Group: ${runMeta.group} (${runMeta.caseCount} cases)`);
  lines.push(`- Requested model: ${runMeta.requestedModel}`);
  lines.push(
    `- Returned model version(s): ${
      runMeta.returnedModelVersions.length ? runMeta.returnedModelVersions.join(", ") : "N/A (no successful calls)"
    }`,
  );
  lines.push(`- Review threshold: ${(runMeta.reviewThreshold * 100).toFixed(0)}% (demo setting)`);
  lines.push(`- Question configuration hash: ${runMeta.questionConfigHash}`);
  lines.push(`- Dataset snapshot hash: ${runMeta.datasetHash}`);
  lines.push("");

  lines.push("## Metrics");
  lines.push("");
  lines.push("Confidence is not accuracy, and a low-confidence route to Human Review does not guarantee the");
  lines.push("review will catch every incorrect decision. Latency is API round-trip time, not pure model");
  lines.push("inference time.");
  lines.push("");
  for (const line of formatMetricsSummary(metrics)) {
    lines.push(`- ${line}`);
  }
  lines.push("");

  lines.push("## Case-by-case results");
  lines.push("");
  lines.push(
    "| ID | Group | Expected | Model choice | Confidence | Final team | Reason | Match | Latency (ms) | Model / status |",
  );
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const result of results) {
    lines.push(`| ${caseRow(result)} |`);
  }
  lines.push("");

  return lines.join("\n");
}
