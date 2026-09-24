// Live evaluation runner. Reuses the application's actual question
// definition, Jev integration, response validation, timeout, and routing
// policy — it does not duplicate any of that logic.
//
// Usage:
//   npm run evaluate -- --group dev
//   npm run evaluate -- --group holdout
//
// Makes real requests against the TypeSafe API and consumes real API
// quota. Never run in CI or automated tests.

import { loadEnvConfig } from "@next/env";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { AppError, analyzeIncident, getRequestedModel } from "@/lib/jev";
import { REVIEW_CONFIDENCE_THRESHOLD, decideRouting } from "@/lib/routing";
import { buildTeamQuestion, TEAM_QUESTION_ID } from "@/lib/team-question";

import { EVALUATION_DATASET, type EvaluationCase, type EvaluationGroup } from "./dataset";
import { computeMetrics, type CaseResult } from "./metrics";
import { buildJsonReport, buildMarkdownReport, formatMetricsSummary, type RunMetadata } from "./report";

class CliError extends Error {}

const FATAL_CODES = new Set(["missing_config", "auth_failed", "rate_limited"]);

function parseGroupArg(argv: string[]): EvaluationGroup {
  const idx = argv.indexOf("--group");
  const value = idx !== -1 ? argv[idx + 1] : undefined;
  if (value === "dev") return "development";
  if (value === "holdout") return "holdout";
  throw new CliError(
    'Missing or invalid --group. Usage: npm run evaluate -- --group <dev|holdout>',
  );
}

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function runCase(evaluationCase: EvaluationCase): Promise<CaseResult> {
  try {
    const analysis = await analyzeIncident(evaluationCase.report);
    const routing = decideRouting(analysis.modelChoice, analysis.confidence);
    return {
      ...evaluationCase,
      outcome: {
        status: "success",
        modelChoice: analysis.modelChoice,
        confidence: analysis.confidence,
        probabilities: analysis.probabilities,
        model: analysis.model,
        upstreamRoundTripMs: analysis.upstreamRoundTripMs,
        routing,
        matchesExpected: analysis.modelChoice === evaluationCase.expectedModelChoice,
      },
    };
  } catch (error) {
    const appError = error instanceof AppError ? error : null;
    return {
      ...evaluationCase,
      outcome: {
        status: "failed",
        errorStatus: appError?.status ?? 500,
        errorCode: appError?.code ?? "unknown_error",
        errorMessage: appError?.message ?? "Unexpected error.",
      },
    };
  }
}

async function main() {
  // Loads .env.local (and friends) the same way `next dev`/`next build` do.
  // Never logs or returns the values it loads.
  loadEnvConfig(process.cwd(), true);

  const group = parseGroupArg(process.argv.slice(2));
  const cases = EVALUATION_DATASET.filter((c) => c.group === group);

  console.log(`Evaluation group: ${group}`);
  console.log(`Cases to run: ${cases.length}`);
  console.log(
    "This run makes real requests against the TypeSafe API and consumes real API quota.",
  );
  console.log("Requests run sequentially with no automatic retries.\n");

  const results: CaseResult[] = [];
  let stopReason: string | null = null;

  for (let i = 0; i < cases.length; i++) {
    const evaluationCase = cases[i];

    if (stopReason) {
      results.push({ ...evaluationCase, outcome: { status: "unattempted" } });
      continue;
    }

    process.stdout.write(`[${i + 1}/${cases.length}] ${evaluationCase.id} ... `);
    const result = await runCase(evaluationCase);
    results.push(result);

    if (result.outcome.status === "success") {
      const { modelChoice, routing, upstreamRoundTripMs } = result.outcome;
      console.log(`ok: ${modelChoice} -> ${routing.finalTeam} (${routing.reasonCode}), ${upstreamRoundTripMs} ms`);
    } else if (result.outcome.status === "failed") {
      const { errorStatus, errorCode, errorMessage } = result.outcome;
      console.log(`FAILED (${errorStatus} ${errorCode}): ${errorMessage}`);
      if (FATAL_CODES.has(errorCode)) {
        stopReason = `${errorCode}: ${errorMessage}`;
      }
    }
  }

  if (stopReason) {
    console.error(`\nStopping run early — ${stopReason}`);
    console.error("Remaining cases recorded as unattempted. Saving partial results.\n");
  }

  const returnedModelVersions = Array.from(
    new Set(
      results
        .map((r) => (r.outcome.status === "success" ? r.outcome.model : null))
        .filter((v): v is string => v !== null),
    ),
  );

  const runMeta: RunMetadata = {
    timestamp: new Date().toISOString(),
    group,
    caseCount: cases.length,
    requestedModel: getRequestedModel(),
    returnedModelVersions,
    reviewThreshold: REVIEW_CONFIDENCE_THRESHOLD,
    questionConfigHash: hash({ id: TEAM_QUESTION_ID, question: buildTeamQuestion() }),
    datasetHash: hash(
      cases.map((c) => ({
        id: c.id,
        report: c.report,
        expectedModelChoice: c.expectedModelChoice,
      })),
    ),
  };

  const metrics = computeMetrics(results);

  const outDir = path.join(process.cwd(), "evaluation", "results");
  mkdirSync(outDir, { recursive: true });
  const stamp = runMeta.timestamp.replace(/[:.]/g, "-");
  const baseName = `${stamp}-${group}`;
  const jsonPath = path.join(outDir, `${baseName}.json`);
  const mdPath = path.join(outDir, `${baseName}.md`);

  writeFileSync(jsonPath, JSON.stringify(buildJsonReport(runMeta, results, metrics), null, 2));
  writeFileSync(mdPath, buildMarkdownReport(runMeta, results, metrics));

  console.log(`\nSaved: ${path.relative(process.cwd(), jsonPath)}`);
  console.log(`Saved: ${path.relative(process.cwd(), mdPath)}\n`);

  for (const line of formatMetricsSummary(metrics)) {
    console.log(line);
  }

  if (stopReason) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  if (error instanceof CliError) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }
  console.error("Evaluation run failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
