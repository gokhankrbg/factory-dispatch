"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, requestAnalysis } from "@/lib/api-client";
import { applyIncidentEvent, type Incident, type IncidentSource } from "@/lib/incident-reducer";
import { runDemoSequence, type DemoController } from "@/lib/demo-runner";
import { LIVE_DEMO_REPORTS } from "@/lib/demo-fixture";
import { computeSessionMetrics, groupIncidentsByFinalTeam } from "@/lib/session-metrics";
import { TEAM_LABELS } from "@/lib/types";

export type DemoStatus = "idle" | "running" | "stopping";

/** Display pacing only — never affects the measured API round-trip time. */
export type DemoPacing = "presentation" | "fast";

export const DEMO_PACING_MS: Record<DemoPacing, number> = {
  presentation: 5000,
  fast: 300,
};

function createIncidentId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `incident-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useIncidentSession() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [pending, setPending] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [demoStatus, setDemoStatus] = useState<DemoStatus>("idle");
  const [demoProgress, setDemoProgress] = useState<{ completed: number; total: number } | null>(
    null,
  );
  const [demoError, setDemoError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [pacing, setPacingState] = useState<DemoPacing>("presentation");

  const pendingRef = useRef(false);
  const isMountedRef = useRef(true);
  const demoControllerRef = useRef<DemoController | null>(null);
  const abortControllersRef = useRef(new Set<AbortController>());

  useEffect(() => {
    isMountedRef.current = true;
    const abortControllers = abortControllersRef.current;
    return () => {
      isMountedRef.current = false;
      demoControllerRef.current?.stop();
      for (const controller of abortControllers) controller.abort();
      abortControllers.clear();
    };
  }, []);

  const submitOne = useCallback(async (report: string, source: IncidentSource) => {
    const id = createIncidentId();
    setIncidents((prev) =>
      applyIncidentEvent(prev, { type: "started", id, report, source, createdAt: Date.now() }),
    );
    setSelectedId(id);
    setStatusMessage("Analyzing incident…");

    const controller = new AbortController();
    abortControllersRef.current.add(controller);
    try {
      const result = await requestAnalysis(report, controller.signal);
      if (!isMountedRef.current) return;
      setIncidents((prev) => applyIncidentEvent(prev, { type: "succeeded", id, result }));
      setStatusMessage(`Routed to ${TEAM_LABELS[result.routing.finalTeam]}.`);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Could not reach the server.";
      if (isMountedRef.current) {
        setIncidents((prev) => applyIncidentEvent(prev, { type: "failed", id, error: message }));
        setStatusMessage(`Analysis failed: ${message}`);
      }
      throw error instanceof ApiError ? error : new ApiError(message);
    } finally {
      abortControllersRef.current.delete(controller);
    }
  }, []);

  const submitManual = useCallback(
    async (report: string) => {
      const trimmed = report.trim();
      if (!trimmed || pendingRef.current || demoStatus !== "idle") return;

      pendingRef.current = true;
      setPending(true);
      setManualError(null);
      try {
        await submitOne(trimmed, "manual");
      } catch (error) {
        if (isMountedRef.current) {
          setManualError(error instanceof ApiError ? error.message : "Could not reach the server.");
        }
      } finally {
        pendingRef.current = false;
        if (isMountedRef.current) setPending(false);
      }
    },
    [submitOne, demoStatus],
  );

  const runLiveDemo = useCallback(() => {
    if (pendingRef.current || demoStatus !== "idle") return;

    setDemoError(null);
    setDemoStatus("running");
    setDemoProgress({ completed: 0, total: LIVE_DEMO_REPORTS.length });
    setStatusMessage(`Starting live demo: 0 of ${LIVE_DEMO_REPORTS.length} processed.`);

    const { promise, controller } = runDemoSequence(
      LIVE_DEMO_REPORTS,
      {
        submit: async (report) => {
          pendingRef.current = true;
          setPending(true);
          try {
            await submitOne(report, "demo");
          } finally {
            pendingRef.current = false;
            if (isMountedRef.current) setPending(false);
          }
        },
        onProgress: (completed, total) => {
          if (isMountedRef.current) {
            setDemoProgress({ completed, total });
          }
        },
        onPauseStart: () => {
          if (isMountedRef.current) setStatusMessage("Result received · Next report shortly");
        },
      },
      DEMO_PACING_MS[pacing],
    );
    demoControllerRef.current = controller;

    promise.then((outcome) => {
      demoControllerRef.current = null;
      if (!isMountedRef.current) return;

      if (outcome.haltedByError) {
        setDemoError("Live demo stopped because a request failed. Previous results are kept.");
        setStatusMessage("Live demo halted after a failed request.");
      } else if (outcome.stopped) {
        setStatusMessage(`Live demo stopped after ${outcome.completed} of ${outcome.total}.`);
      } else {
        setStatusMessage(`Live demo finished: ${outcome.completed} of ${outcome.total} processed.`);
      }
      setDemoStatus("idle");
    });
  }, [submitOne, demoStatus, pacing]);

  const stopDemo = useCallback(() => {
    if (demoStatus !== "running") return;
    demoControllerRef.current?.stop();
    setDemoStatus("stopping");
    setStatusMessage("Stopping after current request…");
  }, [demoStatus]);

  const clearSession = useCallback(() => {
    if (pendingRef.current || demoStatus !== "idle") return;
    setIncidents([]);
    setSelectedId(null);
    setManualError(null);
    setDemoError(null);
    setDemoProgress(null);
    setStatusMessage("Session cleared.");
  }, [demoStatus]);

  const setPacing = useCallback(
    (next: DemoPacing) => {
      if (demoStatus !== "idle") return;
      setPacingState(next);
    },
    [demoStatus],
  );

  const metrics = useMemo(() => computeSessionMetrics(incidents), [incidents]);
  const queues = useMemo(() => groupIncidentsByFinalTeam(incidents), [incidents]);
  const selectedIncident = useMemo(
    () => incidents.find((incident) => incident.id === selectedId) ?? null,
    [incidents, selectedId],
  );

  return {
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
    selectIncident: setSelectedId,
    pacing,
    setPacing,
    submitManual,
    runLiveDemo,
    stopDemo,
    clearSession,
  };
}
