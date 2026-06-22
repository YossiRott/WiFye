import { useEffect, useState } from 'react';

const STEPS = ['Parsing frames', 'Mapping networks', 'Extracting hashes', 'Building insights'];
const STEP_INTERVAL_MS = 650;

interface LoadingSectionProps {
  fileName: string | null;
}

export function LoadingSection({ fileName }: LoadingSectionProps) {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    setActiveIdx(0);
    let idx = 0;
    const timer = setInterval(() => {
      idx += 1;
      if (idx < STEPS.length) {
        setActiveIdx(idx);
      } else {
        clearInterval(timer);
      }
    }, STEP_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fileName]);

  return (
    <section className="py-16 text-center">
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-surface p-10">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-border border-t-primary" />
        <div className="mt-5 text-lg font-semibold text-text">Analyzing capture file…</div>
        <div className="mt-1 truncate text-sm text-text-muted">{fileName}</div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs">
          {STEPS.map((step, i) => (
            <span key={step} className="flex items-center gap-2">
              <span className={i <= activeIdx ? 'font-semibold text-primary' : 'text-text-muted/50'}>{step}</span>
              {i < STEPS.length - 1 && <span className="text-text-muted/40">›</span>}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
