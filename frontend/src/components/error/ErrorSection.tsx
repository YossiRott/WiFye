import { Button } from '../common/Button';

interface ErrorSectionProps {
  message: string;
  onRetry: () => void;
}

export function ErrorSection({ message, onRetry }: ErrorSectionProps) {
  return (
    <section className="py-16 text-center">
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-surface p-10">
        <svg viewBox="0 0 24 24" fill="none" className="mx-auto h-10 w-10">
          <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2" />
          <path d="M12 7v5M12 16.5v.5" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <div className="mt-4 text-lg font-semibold text-text">Analysis failed</div>
        <div className="mt-2 text-sm text-text-muted">{message}</div>
        <Button className="mt-6" onClick={onRetry}>
          Try another file
        </Button>
      </div>
    </section>
  );
}
