import type { SessionMetrics } from "@/lib/session-metrics";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export function SessionMetricsBar({ metrics }: { metrics: SessionMetrics }) {
  return (
    <section
      aria-label="Session metrics"
      className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-4"
    >
      <Stat label="Analyzed" value={String(metrics.analyzed)} />
      <Stat label="Auto-routed" value={String(metrics.autoRouted)} />
      <Stat label="Sent to review" value={String(metrics.sentToReview)} />
      <Stat
        label="Median API round-trip"
        value={metrics.medianRoundTripMs === null ? "—" : `${Math.round(metrics.medianRoundTripMs)} ms`}
      />
    </section>
  );
}
