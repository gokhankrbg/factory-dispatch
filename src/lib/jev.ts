// Server-only integration with TypeSafe AI's Jev API. Do not import this
// module from client components — it reads secrets from process.env.

import { TEAM_KEYS, type ModelAnalysis, type TeamKey } from "@/lib/types";
import { TEAM_QUESTION_ID, buildTeamQuestion } from "@/lib/team-question";

/**
 * Machine-readable error category, in addition to the HTTP `status` and the
 * safe, user-facing `message`. Consumers outside the HTTP route (such as the
 * evaluation runner) use this to decide whether a failure is fatal for a
 * whole run (missing config, auth, rate limit) or just for one case.
 */
export type AppErrorCode =
  | "invalid_input"
  | "missing_config"
  | "timeout"
  | "network_error"
  | "auth_failed"
  | "rate_limited"
  | "upstream_error"
  | "invalid_response";

export class AppError extends Error {
  status: number;
  code: AppErrorCode;

  constructor(status: number, code: AppErrorCode, message: string) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }
}

const UPSTREAM_URL = "https://api.typesafe.ai/v1/systemone";
const UPSTREAM_TIMEOUT_MS = 15_000;
const MAX_REPORT_LENGTH = 2000;
const PROBABILITY_SUM_TOLERANCE = 0.02;

/** Validates and normalizes the parsed request body. Throws AppError(400) on any problem. */
export function validateReport(body: unknown): string {
  if (typeof body !== "object" || body === null || !("report" in body)) {
    throw new AppError(400, "invalid_input", 'Request body must include a "report" string.');
  }

  const { report } = body as { report: unknown };
  if (typeof report !== "string") {
    throw new AppError(400, "invalid_input", 'Request body must include a "report" string.');
  }

  const trimmed = report.trim();
  if (trimmed.length === 0) {
    throw new AppError(400, "invalid_input", "Report cannot be empty.");
  }
  if (trimmed.length > MAX_REPORT_LENGTH) {
    throw new AppError(
      400,
      "invalid_input",
      `Report must be ${MAX_REPORT_LENGTH} characters or fewer.`,
    );
  }

  return trimmed;
}

/** The configured model id, with no dependency on the API key being present. Contains no secrets. */
export function getRequestedModel(): string {
  return process.env.TYPESAFE_MODEL?.trim() || "jev-latest";
}

function getConfig(): { apiKey: string; model: string } {
  const apiKey = process.env.TYPESAFE_API_KEY;
  if (!apiKey) {
    throw new AppError(
      500,
      "missing_config",
      "Incident analysis is not configured on the server.",
    );
  }
  return { apiKey, model: getRequestedModel() };
}

async function callSystemOne(
  report: string,
  apiKey: string,
  model: string,
): Promise<{ raw: unknown; upstreamRoundTripMs: number }> {
  const payload = {
    model,
    state: {
      operator_note: report,
    },
    questions: {
      [TEAM_QUESTION_ID]: buildTeamQuestion(),
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  const startedAt = performance.now();
  let response: Response;
  try {
    response = await fetch(UPSTREAM_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new AppError(504, "timeout", "Incident analysis timed out. Please try again.");
    }
    throw new AppError(502, "network_error", "Could not reach the incident analysis service.");
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new AppError(
        502,
        "auth_failed",
        "Incident analysis service rejected the server credentials.",
      );
    }
    if (response.status === 429) {
      throw new AppError(
        429,
        "rate_limited",
        "Incident analysis service is rate-limited. Please try again shortly.",
      );
    }
    throw new AppError(502, "upstream_error", "Incident analysis service returned an error.");
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    throw new AppError(
      502,
      "invalid_response",
      "Incident analysis service returned an invalid response.",
    );
  }
  const upstreamRoundTripMs = Math.round(performance.now() - startedAt);

  return { raw, upstreamRoundTripMs };
}

function isProbability(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isTeamKey(value: unknown): value is TeamKey {
  return typeof value === "string" && (TEAM_KEYS as readonly string[]).includes(value);
}

/** Validates the upstream JSON at runtime. Throws AppError(502) on any mismatch. */
function parseAnalyzeResponse(raw: unknown): Omit<ModelAnalysis, "upstreamRoundTripMs"> {
  const shapeError = () =>
    new AppError(
      502,
      "invalid_response",
      "Incident analysis service returned an unexpected response.",
    );

  if (typeof raw !== "object" || raw === null) throw shapeError();
  const body = raw as Record<string, unknown>;

  if (typeof body.model !== "string" || body.model.trim().length === 0) {
    throw shapeError();
  }

  if (typeof body.answers !== "object" || body.answers === null) throw shapeError();
  const teamAnswer = (body.answers as Record<string, unknown>)[TEAM_QUESTION_ID];
  if (typeof teamAnswer !== "object" || teamAnswer === null) throw shapeError();
  const answer = teamAnswer as Record<string, unknown>;

  if (answer.type !== "choice") throw shapeError();
  if (!isTeamKey(answer.choice)) throw shapeError();
  if (!isProbability(answer.confidence)) throw shapeError();

  if (typeof answer.probabilities !== "object" || answer.probabilities === null) {
    throw shapeError();
  }
  const rawProbabilities = answer.probabilities as Record<string, unknown>;

  const probabilities = {} as Record<TeamKey, number>;
  let sum = 0;
  for (const key of TEAM_KEYS) {
    const value = rawProbabilities[key];
    if (!isProbability(value)) throw shapeError();
    probabilities[key] = value;
    sum += value;
  }
  if (Math.abs(sum - 1) > PROBABILITY_SUM_TOLERANCE) throw shapeError();

  return {
    modelChoice: answer.choice,
    confidence: answer.confidence,
    probabilities,
    model: body.model,
  };
}

export async function analyzeIncident(report: string): Promise<ModelAnalysis> {
  const { apiKey, model } = getConfig();
  const { raw, upstreamRoundTripMs } = await callSystemOne(report, apiKey, model);
  const parsed = parseAnalyzeResponse(raw);
  return { ...parsed, upstreamRoundTripMs };
}
