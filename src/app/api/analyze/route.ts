import { NextResponse } from "next/server";
import { AppError, analyzeIncident, validateReport } from "@/lib/jev";
import { decideRouting } from "@/lib/routing";
import type { AnalyzeResponse } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  try {
    const report = validateReport(body);
    const analysis = await analyzeIncident(report);
    const routing = decideRouting(analysis.modelChoice, analysis.confidence);

    const responseBody: AnalyzeResponse = { ...analysis, routing };
    return NextResponse.json(responseBody, { status: 200 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(
      "Unexpected /api/analyze failure:",
      error instanceof Error ? error.message : "unknown error",
    );
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 },
    );
  }
}
