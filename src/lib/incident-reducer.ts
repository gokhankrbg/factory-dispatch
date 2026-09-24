// A tiny, pure event reducer for the in-memory session's incident list.
// Framework-agnostic and side-effect free, so it's directly unit-testable:
// "started" always adds exactly one incident, and "succeeded"/"failed"
// only ever update the one incident with a matching id — they can never
// create a duplicate card for the same submission.

import type { AnalyzeResponse } from "@/lib/types";

export type IncidentSource = "manual" | "demo";
export type IncidentStatus = "analyzing" | "done" | "failed";

export interface Incident {
  id: string;
  report: string;
  source: IncidentSource;
  status: IncidentStatus;
  createdAt: number;
  result?: AnalyzeResponse;
  error?: string;
}

export type IncidentEvent =
  | { type: "started"; id: string; report: string; source: IncidentSource; createdAt: number }
  | { type: "succeeded"; id: string; result: AnalyzeResponse }
  | { type: "failed"; id: string; error: string };

export function applyIncidentEvent(incidents: Incident[], event: IncidentEvent): Incident[] {
  switch (event.type) {
    case "started":
      return [
        ...incidents,
        {
          id: event.id,
          report: event.report,
          source: event.source,
          status: "analyzing",
          createdAt: event.createdAt,
        },
      ];
    case "succeeded":
      return incidents.map((incident) =>
        incident.id === event.id
          ? { ...incident, status: "done", result: event.result, error: undefined }
          : incident,
      );
    case "failed":
      return incidents.map((incident) =>
        incident.id === event.id ? { ...incident, status: "failed", error: event.error } : incident,
      );
    default:
      return incidents;
  }
}
