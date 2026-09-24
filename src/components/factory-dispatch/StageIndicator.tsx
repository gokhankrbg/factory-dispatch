export type Stage = "report" | "analyzing" | "routed" | "failed";

const STEPS: { key: "report" | "analyzing" | "routed"; label: string }[] = [
  { key: "report", label: "Report" },
  { key: "analyzing", label: "Analyzing" },
  { key: "routed", label: "Routed" },
];

const STEP_INDEX: Record<Stage, number> = {
  report: 0,
  analyzing: 1,
  failed: 1,
  routed: 2,
};

type StepState = "completed" | "current" | "pending" | "failed";

function stateFor(stage: Stage, index: number): StepState {
  if (stage === "failed" && index === 1) return "failed";
  const activeIndex = STEP_INDEX[stage];
  if (index < activeIndex) return "completed";
  if (index === activeIndex) return "current";
  return "pending";
}

const STATE_CLASSES: Record<StepState, string> = {
  completed: "border border-emerald-300 bg-emerald-50 text-emerald-800",
  current: "bg-slate-900 text-white",
  pending: "bg-slate-100 text-slate-500",
  failed: "bg-red-600 text-white",
};

export function StageIndicator({ stage }: { stage: Stage }) {
  const activeIndex = STEP_INDEX[stage];
  const currentLabel = stage === "failed" ? "Failed during analysis" : STEPS[activeIndex].label;

  return (
    <div className="flex items-center gap-2">
      <span className="sr-only">Stage: {currentLabel}</span>
      <ol className="flex items-center gap-2 text-xs font-medium" aria-hidden="true">
        {STEPS.map((step, index) => {
          const state = stateFor(stage, index);
          return (
            <li key={step.key} className="flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${STATE_CLASSES[state]}`}
              >
                {state === "completed" && <span>&#10003;</span>}
                {state === "failed" ? "Failed" : step.label}
              </span>
              {index < STEPS.length - 1 && <span className="text-slate-300">&rarr;</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
