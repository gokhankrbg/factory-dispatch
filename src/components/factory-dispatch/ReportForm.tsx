"use client";

import { useState } from "react";

const EXAMPLES: { label: string; report: string }[] = [
  {
    label: "Equipment fault",
    report:
      "The conveyor keeps stopping, and there is a grinding noise near the drive motor.",
  },
  {
    label: "Label defect",
    report:
      "Labels on the latest batch show the wrong product code. Production is still running.",
  },
  {
    label: "Material shortage",
    report:
      "We have run out of empty cartons at the packaging station. The machine is working, but the line is waiting for supplies.",
  },
  {
    label: "Vague report",
    report: "Something seems wrong on the line, but I have no further details.",
  },
];

interface ReportFormProps {
  disabled: boolean;
  pending: boolean;
  error: string | null;
  onSubmit: (report: string) => void;
}

export function ReportForm({ disabled, pending, error, onSubmit }: ReportFormProps) {
  const [report, setReport] = useState("");
  const canSubmit = report.trim().length > 0 && !disabled;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <label htmlFor="operator-report" className="block text-sm font-medium text-slate-900">
        Operator report
      </label>
      <textarea
        id="operator-report"
        value={report}
        onChange={(event) => setReport(event.target.value)}
        rows={3}
        disabled={disabled}
        placeholder="Describe the incident as it was reported on the floor..."
        className="mt-2 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:bg-slate-50 disabled:text-slate-400"
      />

      <div className="mt-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Example reports
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <button
              key={example.label}
              type="button"
              disabled={disabled}
              onClick={() => setReport(example.report)}
              className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {example.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div role="alert" className="mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => onSubmit(report)}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
        >
          {pending ? "Analyzing…" : "Analyze incident"}
        </button>
      </div>
    </section>
  );
}
