// A static explanation of the request pipeline — not a per-incident
// processing animation. It never changes based on session state.

const STAGES = ["Operator report", "Jev assessment", "Routing policy", "Team queue"];

export function ArchitectureStrip() {
  return (
    <div
      role="img"
      aria-label={`How Factory Dispatch works: ${STAGES.join(" leads to ")}`}
      className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 shadow-sm"
    >
      {STAGES.map((stage, index) => (
        <span key={stage} className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
            {stage}
          </span>
          {index < STAGES.length - 1 && (
            <span aria-hidden="true" className="text-slate-300">
              &rarr;
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
