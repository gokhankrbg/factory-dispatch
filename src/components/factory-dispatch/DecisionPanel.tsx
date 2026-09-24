import { forwardRef } from "react";
import { ROUTING_REASON_EXPLANATIONS, TEAM_KEYS, TEAM_LABELS } from "@/lib/types";
import type { Incident } from "@/lib/incident-reducer";
import { TEAM_ACCENTS } from "@/lib/team-style";
import { StageIndicator, type Stage } from "./StageIndicator";

function stageFor(incident: Incident | null): Stage {
  if (!incident) return "report";
  if (incident.status === "analyzing") return "analyzing";
  if (incident.status === "failed") return "failed";
  return "routed";
}

export const DecisionPanel = forwardRef<HTMLElement, { incident: Incident | null }>(
  function DecisionPanel({ incident }, ref) {
    const stage = stageFor(incident);

    return (
      <section
        ref={ref}
        tabIndex={-1}
        className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
      >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-slate-900">Decision</h2>
        <StageIndicator stage={stage} />
      </div>

      {!incident && (
        <div className="mt-3 flex min-h-[140px] items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          Analyze an incident to see the model recommendation and final routing.
        </div>
      )}

      {incident && (
        <div className="mt-4">
          <p className="text-xs text-slate-500">Report</p>
          <p className="mt-1 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {incident.report}
          </p>

          {incident.status === "analyzing" && (
            <div
              className="mt-4 flex min-h-[80px] items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500"
              role="status"
            >
              Analyzing incident&hellip;
            </div>
          )}

          {incident.status === "failed" && (
            <div role="alert" className="mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {incident.error ?? "Analysis failed."}
            </div>
          )}

          {incident.status === "done" && incident.result && (() => {
            const result = incident.result;
            return (
              <>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="rounded-md border border-slate-200 px-3 py-2">
                    <p className="text-xs text-slate-500">Model recommendation</p>
                    <p className="text-base font-semibold text-slate-900">
                      {TEAM_LABELS[result.modelChoice]}
                    </p>
                    <p className="text-xs text-slate-500">
                      Confidence: {(result.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div
                    className={`rounded-md border px-3 py-2 ${TEAM_ACCENTS[result.routing.finalTeam].badge}`}
                  >
                    <p className="text-xs opacity-80">Final routing</p>
                    <p className="text-base font-semibold">
                      {TEAM_LABELS[result.routing.finalTeam]}
                    </p>
                    <p className="text-xs opacity-80">
                      {ROUTING_REASON_EXPLANATIONS[result.routing.reasonCode]}
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-400">
                  Review threshold: {(result.routing.threshold * 100).toFixed(0)}%
                  &nbsp;&middot;&nbsp;Demo setting
                </p>

                <div className="mt-4 space-y-2">
                  {TEAM_KEYS.map((key) => (
                    <div key={key}>
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${TEAM_ACCENTS[key].dot}`} />
                          {TEAM_LABELS[key]}
                        </span>
                        <span>{(result.probabilities[key] * 100).toFixed(0)}%</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full motion-safe:transition-[width] motion-safe:duration-300 ${TEAM_ACCENTS[key].bar}`}
                          style={{ width: `${result.probabilities[key] * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-slate-500">
                  <span>
                    API round-trip:{" "}
                    <span className="font-medium text-slate-700">
                      {result.upstreamRoundTripMs} ms
                    </span>
                  </span>
                  <span>
                    Model: <span className="font-medium text-slate-700">{result.model}</span>
                  </span>
                </div>

                <div className="mt-4 space-y-1 text-xs text-slate-400">
                  <p>Model confidence is not a guarantee of correctness.</p>
                  <p>API round-trip includes network and provider processing.</p>
                  <p>
                    The review threshold is an initial, unvalidated demo setting, not a proven
                    safety threshold.
                  </p>
                </div>
              </>
            );
          })()}
        </div>
      )}
      </section>
    );
  },
);
