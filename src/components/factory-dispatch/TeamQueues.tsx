import { TEAM_KEYS, TEAM_LABELS, type TeamKey } from "@/lib/types";
import type { Incident } from "@/lib/incident-reducer";
import { TEAM_ACCENTS } from "@/lib/team-style";
import { reviewReasonBadge, reviewSuggestionText } from "@/lib/review-badge";

interface TeamQueuesProps {
  queues: Record<TeamKey, Incident[]>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function TeamQueues({ queues, selectedId, onSelect }: TeamQueuesProps) {
  return (
    <section>
      <h2 className="text-sm font-medium text-slate-900">Team queues</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TEAM_KEYS.map((key) => {
          const items = queues[key] ?? [];
          const accent = TEAM_ACCENTS[key];
          return (
            <div key={key} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-900">
                  <span className={`h-2 w-2 rounded-full ${accent.dot}`} aria-hidden="true" />
                  {TEAM_LABELS[key]}
                </h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                  {items.length}
                </span>
              </div>
              {items.length === 0 ? (
                <p className="mt-2 text-xs text-slate-500">No incidents routed yet.</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {items.map((item) => {
                    const result = item.result;
                    const badge =
                      key === "human_review" && result ? reviewReasonBadge(result.routing) : null;
                    const suggestion =
                      key === "human_review" &&
                      result &&
                      result.routing.reasonCode === "below_confidence_threshold"
                        ? reviewSuggestionText(result.modelChoice, result.confidence)
                        : null;

                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => onSelect(item.id)}
                          className={`w-full rounded-md border px-2 py-1.5 text-left text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${
                            selectedId === item.id
                              ? `${accent.border} bg-slate-50`
                              : "border-transparent bg-slate-50 hover:border-slate-200"
                          }`}
                        >
                          <span className="line-clamp-2 text-slate-700">{item.report}</span>
                          {badge && (
                            <span className="mt-1 inline-flex items-center rounded-full border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                              {badge}
                            </span>
                          )}
                          {suggestion && <p className="mt-1 text-slate-400">{suggestion}</p>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
