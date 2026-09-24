// Pure derivations over the in-memory incident list — no I/O, directly
// unit-testable. Metrics are computed only from successful ("done")
// results in the current session; analyzing/failed incidents never
// contribute a count here.

import type { TeamKey } from "@/lib/types";
import type { Incident } from "@/lib/incident-reducer";

export interface SessionMetrics {
  analyzed: number;
  autoRouted: number;
  sentToReview: number;
  medianRoundTripMs: number | null;
}

function median(sortedAscending: number[]): number {
  const n = sortedAscending.length;
  const mid = Math.floor(n / 2);
  return n % 2 === 0 ? (sortedAscending[mid - 1] + sortedAscending[mid]) / 2 : sortedAscending[mid];
}

function successfulResults(incidents: Incident[]) {
  return incidents.filter(
    (incident): incident is Incident & { result: NonNullable<Incident["result"]> } =>
      incident.status === "done" && incident.result !== undefined,
  );
}

export function computeSessionMetrics(incidents: Incident[]): SessionMetrics {
  const successes = successfulResults(incidents);
  const autoRouted = successes.filter((i) => i.result.routing.finalTeam !== "human_review").length;
  const latencies = successes.map((i) => i.result.upstreamRoundTripMs).sort((a, b) => a - b);

  return {
    analyzed: successes.length,
    autoRouted,
    sentToReview: successes.length - autoRouted,
    medianRoundTripMs: latencies.length ? median(latencies) : null,
  };
}

export function groupIncidentsByFinalTeam(incidents: Incident[]): Record<TeamKey, Incident[]> {
  const groups: Record<TeamKey, Incident[]> = {
    maintenance: [],
    quality: [],
    logistics: [],
    human_review: [],
  };
  for (const incident of successfulResults(incidents)) {
    groups[incident.result.routing.finalTeam].push(incident);
  }
  return groups;
}
