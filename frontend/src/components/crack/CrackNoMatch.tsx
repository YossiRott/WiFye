interface CrackNoMatchProps {
  title: string;
  hint: string;
}

export function CrackNoMatch({ title, hint }: CrackNoMatchProps) {
  return (
    <div className="flex flex-col items-center gap-2 py-4 text-center">
      <svg viewBox="0 0 20 20" fill="none" width="22" height="22">
        <circle cx="10" cy="10" r="8" stroke="#8b96ad" strokeWidth="1.8" />
        <path d="M7 7l6 6M13 7l-6 6" stroke="#8b96ad" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <div className="text-sm font-semibold text-text">{title}</div>
      <div className="max-w-xs text-xs text-text-muted">{hint}</div>
    </div>
  );
}
