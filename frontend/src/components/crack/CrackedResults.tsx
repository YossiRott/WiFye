import { useState } from 'react';
import type { CrackedPassword } from '../../api/types';

interface CrackedResultsProps {
  cracked: CrackedPassword[];
}

export function CrackedResults({ cracked }: CrackedResultsProps) {
  return (
    <div className="flex flex-col gap-2">
      {cracked.map((entry, i) => (
        <CrackedCard key={`${entry.ssid}-${i}`} entry={entry} />
      ))}
    </div>
  );
}

function CrackedCard({ entry }: { entry: CrackedPassword }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
      <span className="text-2xl">🔓</span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-text">{entry.ssid || 'Unknown Network'}</div>
        <div className="mt-1 flex items-center gap-2">
          <span className="font-mono text-sm text-emerald-300">{entry.password}</span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(entry.password);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="text-xs text-text-muted hover:text-text"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}
