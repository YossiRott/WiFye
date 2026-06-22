import { useState } from 'react';
import type { NetworkEntry } from '../../../api/types';
import { encBadgeClasses } from '../../../utils/colors';
import { Badge } from '../../common/Badge';
import { SignalBars } from '../../common/SignalBars';
import { ClientItem } from './ClientItem';

interface ApCardProps {
  network: NetworkEntry;
}

export function ApCard({ network }: ApCardProps) {
  const [open, setOpen] = useState(false);
  const clients = network.clients || [];
  const hasDvr = clients.some((c) => c.device_type === 'DVR/Camera');

  return (
    <div className="rounded-xl border border-border bg-surface">
      <button type="button" className="flex w-full items-center gap-3 p-3 text-left" onClick={() => setOpen((o) => !o)}>
        <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 shrink-0">
          <path d="M5 12.5C7 10 9.3 8.5 12 8.5c2.7 0 5 1.5 7 4" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" />
          <path d="M8 15.5c1.1-1.2 2.4-2 4-2s2.9.8 4 2" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="18.5" r="1.5" fill="#0ea5e9" />
        </svg>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-text">{network.ssid}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-xs text-text-muted">{network.bssid}</span>
            <Badge className={encBadgeClasses(network.encryption)}>{network.encryption}</Badge>
            {network.channel ? <Badge className="border-border bg-surface-2 text-text-muted">CH {network.channel}</Badge> : null}
            {hasDvr ? <Badge className="border-red-500/30 bg-red-500/10 text-red-400">DVR detected</Badge> : null}
            {network.is_evil_twin ? <Badge className="border-red-500/30 bg-red-500/10 text-red-400">Evil Twin</Badge> : null}
          </div>
          {(network.first_seen || network.last_seen) && (
            <div className="mt-1 text-[11px] text-text-muted">
              {network.first_seen && <span>▷ {network.first_seen}</span>}
              {network.first_seen && network.last_seen && '  '}
              {network.last_seen && <span>◁ {network.last_seen}</span>}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {network.signal_dbm ? <SignalBars dbm={network.signal_dbm} /> : null}
          <span className="text-xs text-text-muted">
            {clients.length} client{clients.length !== 1 ? 's' : ''}
          </span>
          <svg
            viewBox="0 0 20 20"
            fill="none"
            className={`h-4 w-4 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`}
          >
            <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      </button>
      {open && (
        <div className="border-t border-border p-3">
          {clients.length ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {clients.map((c) => (
                <ClientItem key={c.mac} client={c} />
              ))}
            </div>
          ) : (
            <div className="text-sm text-text-muted">No clients observed for this network</div>
          )}
        </div>
      )}
    </div>
  );
}
