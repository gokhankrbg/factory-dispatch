export function AboutDemoDisclosure() {
  return (
    <details className="group rounded-lg border border-slate-200 bg-white shadow-sm">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-slate-900 marker:content-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">
        <span className="inline-flex items-center gap-2">
          About this demo
          <span aria-hidden="true" className="text-slate-400 transition-transform group-open:rotate-180">
            &#9660;
          </span>
        </span>
      </summary>
      <div className="space-y-1.5 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
        <p>Reports are synthetic examples, not real operator submissions or production incidents.</p>
        <p>Model confidence is not a guarantee of correctness.</p>
        <p>
          Human Review is a routing destination, not an emergency or severity flag. Not every
          Human Review outcome comes from a low-confidence score — the model can select Human
          Review directly, independent of the confidence threshold.
        </p>
        <p>
          The review threshold and the demo pacing settings are unvalidated demo conveniences,
          not proven production settings.
        </p>
      </div>
    </details>
  );
}
