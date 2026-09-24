"use client";

import { useCallback, useRef, useState } from "react";
import { useIncidentSession } from "@/hooks/useIncidentSession";
import { Header } from "@/components/factory-dispatch/Header";
import { ReportForm } from "@/components/factory-dispatch/ReportForm";
import { DecisionPanel } from "@/components/factory-dispatch/DecisionPanel";
import { TeamQueues } from "@/components/factory-dispatch/TeamQueues";
import { ActivityList } from "@/components/factory-dispatch/ActivityList";
import { SessionMetricsBar } from "@/components/factory-dispatch/SessionMetricsBar";
import { LiveDemoPanel } from "@/components/factory-dispatch/LiveDemoPanel";
import { PresentationView } from "@/components/factory-dispatch/PresentationView";
import { ViewToggle, type ViewMode } from "@/components/factory-dispatch/ViewToggle";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const PRESENTATION_SUBTITLE = "From operator reports to typed routing decisions.";

export default function Home() {
  const {
    incidents,
    metrics,
    queues,
    pending,
    manualError,
    demoStatus,
    demoProgress,
    demoError,
    statusMessage,
    selectedIncident,
    selectIncident,
    pacing,
    setPacing,
    submitManual,
    runLiveDemo,
    stopDemo,
    clearSession,
  } = useIncidentSession();

  const [viewMode, setViewMode] = useState<ViewMode>("normal");
  const decisionPanelRef = useRef<HTMLElement>(null);

  // Only explicit user selections (a queue card or activity item click) route
  // through this wrapper, so an incident that arrives on its own during a
  // live demo run never causes the page to scroll on its own.
  const handleSelect = useCallback(
    (id: string) => {
      selectIncident(id);
      const panel = decisionPanelRef.current;
      if (!panel) return;
      panel.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "nearest",
        inline: "nearest",
      });
      panel.focus({ preventScroll: true });
    },
    [selectIncident],
  );

  const activeRequestOrDemo = pending || demoStatus !== "idle";
  const formDisabled = activeRequestOrDemo;
  const canClear = !pending && demoStatus === "idle";

  return (
    <div className="flex min-h-full flex-col bg-slate-50">
      <Header subtitle={viewMode === "presentation" ? PRESENTATION_SUBTITLE : undefined} />

      <div className="border-b border-slate-200 bg-white px-6 py-2">
        <div className="mx-auto flex max-w-6xl justify-end">
          <ViewToggle mode={viewMode} disabled={activeRequestOrDemo} onChange={setViewMode} />
        </div>
      </div>

      {viewMode === "presentation" ? (
        <PresentationView
          metrics={metrics}
          queues={queues}
          selectedIncident={selectedIncident}
          pending={pending}
          demoStatus={demoStatus}
          demoProgress={demoProgress}
          demoError={demoError}
          statusMessage={statusMessage}
          pacing={pacing}
          onPacingChange={setPacing}
          onRun={runLiveDemo}
          onStop={stopDemo}
          onSelect={handleSelect}
          canClear={canClear}
          onClear={clearSession}
          decisionPanelRef={decisionPanelRef}
        />
      ) : (
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-5">
          <SessionMetricsBar metrics={metrics} />

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <ReportForm
                disabled={formDisabled}
                pending={pending}
                error={manualError}
                onSubmit={submitManual}
              />
              <LiveDemoPanel
                demoStatus={demoStatus}
                demoProgress={demoProgress}
                demoError={demoError}
                manualPending={pending}
                statusMessage={statusMessage}
                pacing={pacing}
                onPacingChange={setPacing}
                onRun={runLiveDemo}
                onStop={stopDemo}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!canClear}
                  onClick={clearSession}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear session
                </button>
              </div>
            </div>

            <DecisionPanel ref={decisionPanelRef} incident={selectedIncident} />
          </div>

          <div className="mt-4">
            <TeamQueues
              queues={queues}
              selectedId={selectedIncident?.id ?? null}
              onSelect={handleSelect}
            />
          </div>

          <div className="mt-4">
            <ActivityList
              incidents={incidents}
              selectedId={selectedIncident?.id ?? null}
              onSelect={handleSelect}
            />
          </div>
        </main>
      )}

      <footer className="border-t border-slate-200 bg-white px-6 py-4 text-center text-xs text-slate-400">
        Routing demonstration only &middot; No equipment control
      </footer>
    </div>
  );
}
