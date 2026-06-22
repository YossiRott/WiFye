import type { CrackedPassword, CrackStats, CrackStatusResponse } from '../../api/types';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { CrackedResults } from './CrackedResults';
import { CrackNoMatch } from './CrackNoMatch';

interface CrackConsoleProps {
  status: CrackStatusResponse['status'];
  done: boolean;
  stats: CrackStats;
  cracked: CrackedPassword[];
  onStop: () => void;
  onNewSearch: () => void;
}

function badgeInfo(status: CrackStatusResponse['status'], done: boolean, crackedCount: number) {
  if (!done) return { text: 'Running…', className: 'border-primary/30 bg-primary/15 text-primary' };
  if (crackedCount > 0) {
    return {
      text: `${crackedCount} Password${crackedCount > 1 ? 's' : ''} Cracked!`,
      className: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400',
    };
  }
  if (status === 'stopped') return { text: 'Stopped', className: 'border-zinc-500/30 bg-zinc-500/15 text-zinc-400' };
  return { text: 'Not Found', className: 'border-amber-500/30 bg-amber-500/15 text-amber-400' };
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-2 p-2 text-center">
      <div className="text-[10px] uppercase tracking-wide text-text-muted">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-text">{value}</div>
    </div>
  );
}

export function CrackConsole({ status, done, stats, cracked, onStop, onNewSearch }: CrackConsoleProps) {
  const badge = badgeInfo(status, done, cracked.length);
  const progressPct = Math.min(stats.progress ?? 0, 100);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Badge className={badge.className}>{badge.text}</Badge>
        <div className="flex gap-1.5">
          <Button variant="ghost-red" size="sm" disabled={done} onClick={onStop}>
            Stop
          </Button>
          <Button variant="ghost" size="sm" onClick={onNewSearch}>
            New search
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatBox label="Speed" value={stats.speed || '—'} />
        <StatBox label="Progress" value={stats.progress != null ? `${stats.progress.toFixed(1)}%` : '0%'} />
        <StatBox label="Tested" value={stats.tried != null ? stats.tried.toLocaleString() : '—'} />
        <StatBox label="Elapsed" value={stats.elapsed || '—'} />
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div className="h-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
      </div>

      {done && cracked.length > 0 && <CrackedResults cracked={cracked} />}
      {done && cracked.length === 0 && (
        <CrackNoMatch
          title={status === 'stopped' ? 'Search stopped.' : 'No passwords matched.'}
          hint={
            status === 'stopped'
              ? 'Try again with a larger dictionary.'
              : `Tested ${stats.tried ? stats.tried.toLocaleString() : '—'} candidates at ${stats.speed || '—'}. Try rockyou.txt, a larger dictionary, or add more specific seed words.`
          }
        />
      )}
    </div>
  );
}
