export function Spinner({ className = "", size = 18 }: { className?: string; size?: number }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

// Full-width centered loader for a page/section that's fetching its initial data.
export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted">
      <Spinner className="text-green-700" size={28} />
      <div className="text-sm">{label}</div>
    </div>
  );
}

// Small inline version for filling an empty table/card list area.
export function InlineLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-muted text-sm">
      <Spinner className="text-green-700" size={16} />
      {label}
    </div>
  );
}