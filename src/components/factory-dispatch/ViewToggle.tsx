export type ViewMode = "normal" | "presentation";

interface ViewToggleProps {
  mode: ViewMode;
  disabled: boolean;
  onChange: (mode: ViewMode) => void;
}

export function ViewToggle({ mode, disabled, onChange }: ViewToggleProps) {
  const isPresentation = mode === "presentation";

  return (
    <div className="flex items-center gap-2">
      <span id="presentation-view-label" className="text-xs font-medium text-slate-500">
        Presentation view
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={isPresentation}
        aria-labelledby="presentation-view-label"
        disabled={disabled}
        onClick={() => onChange(isPresentation ? "normal" : "presentation")}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-50 ${
          isPresentation ? "bg-slate-900" : "bg-slate-300"
        }`}
      >
        <span
          aria-hidden="true"
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
            isPresentation ? "translate-x-[18px]" : "translate-x-[3px]"
          }`}
        />
      </button>
    </div>
  );
}
