// Thin, client-safe wrapper around POST /api/analyze. No secrets here — the
// browser never sees the API key, only this app's own endpoint.

import type { AnalyzeResponse } from "@/lib/types";

export class ApiError extends Error {}

export async function requestAnalysis(
  report: string,
  signal?: AbortSignal,
): Promise<AnalyzeResponse> {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ report }),
    signal,
  });

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ApiError("The server returned an unreadable response.");
  }

  if (!response.ok) {
    const errorBody = data as { error?: unknown } | null;
    const message =
      errorBody && typeof errorBody.error === "string" ? errorBody.error : "Analysis failed.";
    throw new ApiError(message);
  }

  return data as AnalyzeResponse;
}
