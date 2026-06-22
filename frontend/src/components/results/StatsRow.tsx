import type { ReactNode } from 'react';
import type { AnalysisSummary } from '../../api/types';
import { fmtNum } from '../../utils/format';

interface StatsRowProps {
  summary: AnalysisSummary;
}

function StatCard({ iconBg, icon, value, label }: { iconBg: string; icon: ReactNode; value: ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-surface px-3 py-5 text-center">
      <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: iconBg }}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-text">{value}</div>
      <div className="text-xs text-text-muted">{label}</div>
    </div>
  );
}

export function StatsRow({ summary }: StatsRowProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <StatCard
        iconBg="#e8a02018"
        icon={
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <path d="M5 12.5C7 10 9.3 8.5 12 8.5c2.7 0 5 1.5 7 4" stroke="#e8a020" strokeWidth="2" strokeLinecap="round" />
            <path d="M8 15.5c1.1-1.2 2.4-2 4-2s2.9.8 4 2" stroke="#e8a020" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="18.5" r="1.5" fill="#e8a020" />
          </svg>
        }
        value={summary.total_aps ?? 0}
        label="Access Points"
      />
      <StatCard
        iconBg="#22c55e14"
        icon={
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <rect x="7" y="2" width="10" height="16" rx="2" stroke="#22c55e" strokeWidth="2" />
            <path d="M10 19h4M12 19v2" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
          </svg>
        }
        value={summary.total_clients ?? 0}
        label="Clients"
      />
      <StatCard
        iconBg="#e8a02018"
        icon={
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <circle cx="8" cy="15" r="3" stroke="#e8a020" strokeWidth="2" />
            <path d="M11 15h5l2-2-1-1 1-1-1-1" stroke="#e8a020" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        }
        value={summary.total_handshakes ?? 0}
        label="Handshakes"
      />
      <StatCard
        iconBg="#a855f714"
        icon={
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <rect x="3" y="6" width="18" height="13" rx="2" stroke="#a855f7" strokeWidth="2" />
            <path d="M3 10h18" stroke="#a855f7" strokeWidth="2" />
          </svg>
        }
        value={fmtNum(summary.total_packets ?? 0)}
        label="Packets"
      />
      <StatCard
        iconBg="#ec489914"
        icon={
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <circle cx="12" cy="12" r="9" stroke="#ec4899" strokeWidth="2" />
            <path d="M12 7v5l3 3" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" />
          </svg>
        }
        value={summary.scan_duration || '—'}
        label="Duration"
      />
    </div>
  );
}
