import type { DemoPacing, DemoStatus } from "@/hooks/useIncidentSession";

interface LiveDemoPanelProps {
  demoStatus: DemoStatus;
  demoProgress: { completed: number; total: number } | null;
  demoError: string | null;
  manualPending: boolean;
  statusMessage: string;
  pacing: DemoPacing;
  onPacingChange: (pacing: DemoPacing) => void;
  onRun: () => void;
  onStop: () => void;
}

const PACING_OPTIONS: { value: DemoPacing; label: string }[] = [
  { value: "presentation", label: "Presentation" },
  { value: "fast", label: "Fast" },
];

export function LiveDemoPanel({
  demoStatus,
  demoProgress,
  demoError,
  manualPending,
  statusMessage,
  pacing,
  onPacingChange,
  onRun,
  onStop,
}: LiveDemoPanelProps) {
  const canRun = demoStatus === "idle" && !manualPending;
  const pacingEditable = demoStatus === "idle";

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-slate-900">Live demo</h2>
          <p className="text-xs text-slate-500">
            Runs 8 synthetic reports through Jev using real API requests.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {demoStatus === "idle" ? (
            <button
              type="button"
              onClick={onRun}
              disabled={!canRun}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
            >
              Run live demo
            </button>
          ) : (
            <button
              type="button"
              onClick={onStop}
              disabled={demoStatus === "stopping"}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {demoStatus === "stopping" ? "Stopping…" : "Stop demo"}
            </button>
          )}
        </div>
      </div>

      <div className="mt-3">
        <fieldset disabled={!pacingEditable}>
          <legend className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Pacing
          </legend>
          <div className="mt-1.5 inline-flex overflow-hidden rounded-md border border-slate-300">
            {PACING_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={pacing === option.value}
                onClick={() => onPacingChange(option.value)}
                className={`px-3 py-1 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-50 ${
                  pacing === option.value
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>
        <p className="mt-1 text-xs text-slate-400">
          Display pacing only. API timing is measured separately.
        </p>
      </div>

      {demoProgress && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>
              {demoProgress.completed} of {demoProgress.total} processed
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-slate-900 motion-safe:transition-[width] motion-safe:duration-300"
              style={{ width: `${(demoProgress.completed / demoProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {demoError && (
        <div role="alert" className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {demoError}
        </div>
      )}

      <p role="status" aria-live="polite" className="mt-3 text-xs text-slate-400">
        {statusMessage}
      </p>
    </section>
  );
}
