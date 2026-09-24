import type { RefObject } from "react";
import type { TeamKey } from "@/lib/types";
import type { Incident } from "@/lib/incident-reducer";
import type { SessionMetrics } from "@/lib/session-metrics";
import type { DemoPacing, DemoStatus } from "@/hooks/useIncidentSession";
import { SessionMetricsBar } from "./SessionMetricsBar";
import { LiveDemoPanel } from "./LiveDemoPanel";
import { DecisionPanel } from "./DecisionPanel";
import { TeamQueues } from "./TeamQueues";
import { ArchitectureStrip } from "./ArchitectureStrip";
import { DemoCaveatsStrip } from "./DemoCaveatsStrip";
import { AboutDemoDisclosure } from "./AboutDemoDisclosure";

interface PresentationViewProps {
  metrics: SessionMetrics;
  queues: Record<TeamKey, Incident[]>;
  selectedIncident: Incident | null;
  pending: boolean;
  demoStatus: DemoStatus;
  demoProgress: { completed: number; total: number } | null;
  demoError: string | null;
  statusMessage: string;
  pacing: DemoPacing;
  onPacingChange: (pacing: DemoPacing) => void;
  onRun: () => void;
  onStop: () => void;
  onSelect: (id: string) => void;
  canClear: boolean;
  onClear: () => void;
  decisionPanelRef: RefObject<HTMLElement | null>;
}

// Reuses the same session state, handlers, and real live-demo flow as the
// normal view — this composes existing components differently for a
// recording-friendly layout, rather than building a separate demo.
export function PresentationView({
  metrics,
  queues,
  selectedIncident,
  pending,
  demoStatus,
  demoProgress,
  demoError,
  statusMessage,
  pacing,
  onPacingChange,
  onRun,
  onStop,
  onSelect,
  canClear,
  onClear,
  decisionPanelRef,
}: PresentationViewProps) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-5">
      <ArchitectureStrip />

      <div className="mt-4">
        <SessionMetricsBar metrics={metrics} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <LiveDemoPanel
            demoStatus={demoStatus}
            demoProgress={demoProgress}
            demoError={demoError}
            manualPending={pending}
            statusMessage={statusMessage}
            pacing={pacing}
            onPacingChange={onPacingChange}
            onRun={onRun}
            onStop={onStop}
          />
          <div className="flex justify-end">
            <button
              type="button"
              disabled={!canClear}
              onClick={onClear}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear session
            </button>
          </div>
        </div>

        <DecisionPanel ref={decisionPanelRef} incident={selectedIncident} />
      </div>

      <div className="mt-4">
        <TeamQueues queues={queues} selectedId={selectedIncident?.id ?? null} onSelect={onSelect} />
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <DemoCaveatsStrip />
        <AboutDemoDisclosure />
      </div>
    </main>
  );
}
