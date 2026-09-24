import { TEAM_LABELS } from "@/lib/types";
import type { Incident } from "@/lib/incident-reducer";
import { TEAM_ACCENTS } from "@/lib/team-style";

function statusBadge(incident: Incident) {
  if (incident.status === "analyzing") {
    return <span className="text-xs font-medium text-slate-500">Analyzing&hellip;</span>;
  }
  if (incident.status === "failed") {
    return <span className="text-xs font-medium text-red-600">Failed</span>;
  }
  if (incident.result) {
    const accent = TEAM_ACCENTS[incident.result.routing.finalTeam];
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs font-medium ${accent.badge}`}>
        {TEAM_LABELS[incident.result.routing.finalTeam]}
      </span>
    );
  }
  return null;
}

interface ActivityListProps {
  incidents: Incident[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ActivityList({ incidents, selectedId, onSelect }: ActivityListProps) {
  const items = [...incidents].reverse();

  return (
    <details className="group rounded-lg border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-slate-900 marker:content-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">
        <span className="flex items-center gap-2">
          Activity
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            {items.length}
          </span>
        </span>
        <span aria-hidden="true" className="text-slate-400 transition-transform group-open:rotate-180">
          &#9660;
        </span>
      </summary>
      <div className="border-t border-slate-100 px-4 py-3">
        {items.length === 0 ? (
          <p className="text-xs text-slate-500">No incidents analyzed yet this session.</p>
        ) : (
          <ul className="max-h-64 space-y-1.5 overflow-y-auto">
            {items.map((incident) => (
              <li key={incident.id}>
                <button
                  type="button"
                  onClick={() => onSelect(incident.id)}
                  className={`flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${
                    selectedId === incident.id
                      ? "border-slate-400 bg-slate-50"
                      : "border-transparent bg-slate-50 hover:border-slate-200"
                  }`}
                >
                  <span className="line-clamp-1 text-slate-700">{incident.report}</span>
                  <span className="shrink-0">{statusBadge(incident)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
