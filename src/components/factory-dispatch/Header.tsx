interface HeaderProps {
  subtitle?: string;
}

export function Header({ subtitle = "AI-powered incident triage for manufacturing" }: HeaderProps) {
  return (
    <header className="border-b border-slate-800 bg-slate-900 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Factory Dispatch</h1>
          <p className="mt-0.5 text-sm text-slate-300">{subtitle}</p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Synthetic reports &middot; Live Jev decisions
        </span>
      </div>
    </header>
  );
}
