import { useState } from 'react';
import type { ClientEntry, NetworkEntry } from '../../../api/types';
import { ENC_COLOR, deviceTypeColor, isAlertDeviceType } from '../../../utils/colors';
import { deviceIcon } from '../../../utils/deviceIcons';

interface MapPanelProps {
  networks: NetworkEntry[];
}

const DT_LEGEND: [string, string][] = [
  ['DVR/NVR/Camera', '#dc2626'],
  ['iPhone/iPad', '#6366f1'],
  ['Android', '#16a34a'],
  ['Computer', '#7c3aed'],
  ['Router/AP', '#0284c7'],
  ['IoT/Smart', '#d97706'],
  ['Unknown', '#94a3b8'],
];

function bubbleSize(clientCount: number): number {
  return Math.min(72 + clientCount * 8, 140);
}

function WifiIcon({ color, className }: { color: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M5 12.5C7 10 9.3 8.5 12 8.5c2.7 0 5 1.5 7 4" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <path d="M8 15.5c1.1-1.2 2.4-2 4-2s2.9.8 4 2" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <circle cx={12} cy={18.5} r={1.5} fill={color} />
    </svg>
  );
}

function NetworkBubble({ network, onClick }: { network: NetworkEntry; onClick: () => void }) {
  const col = ENC_COLOR[network.encryption] || '#94a3b8';
  const clientCount = (network.clients || []).length;
  const size = bubbleSize(clientCount);
  const hasDvr = (network.clients || []).some((c) => c.device_type === 'DVR/Camera');

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-2xl p-2 transition-transform hover:scale-105"
      style={{ width: size + 28 }}
    >
      <span
        className="relative flex items-center justify-center rounded-full border-2"
        style={{ width: size, height: size, borderColor: col, background: `${col}1a` }}
      >
        <WifiIcon color={col} className="h-7 w-7" />
        {clientCount > 0 && (
          <span className="absolute -bottom-1 -right-1 rounded-full border border-bg bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-text">
            {clientCount}
          </span>
        )}
        {network.is_evil_twin && (
          <span className="absolute -top-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            !
          </span>
        )}
      </span>
      <span className="w-full truncate text-center text-xs font-semibold text-text">{network.ssid}</span>
      <span className="w-full truncate text-center text-[10px] text-text-muted">
        {network.encryption}
        {network.channel ? ` · CH ${network.channel}` : ''}
      </span>
      {hasDvr && <span className="text-[10px] font-semibold text-red-400">DVR detected</span>}
    </button>
  );
}

function SelectedNetworkHeader({ network }: { network: NetworkEntry }) {
  const col = ENC_COLOR[network.encryption] || '#94a3b8';
  const clientCount = (network.clients || []).length;

  return (
    <div className="flex flex-col items-center gap-3">
      <span
        className="relative flex items-center justify-center rounded-full border-2"
        style={{ width: 120, height: 120, borderColor: col, background: `${col}1a` }}
      >
        <WifiIcon color={col} className="h-10 w-10" />
        {network.is_evil_twin && (
          <span className="absolute -top-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            !
          </span>
        )}
      </span>
      <div className="max-w-xs truncate text-center text-base font-bold text-text">{network.ssid}</div>
      <div className="font-mono text-xs text-text-muted">{network.bssid}</div>
      <div className="text-xs font-medium" style={{ color: col }}>
        {network.encryption}
        {network.channel ? ` · CH ${network.channel}` : ''}
        {network.signal_dbm ? ` · ${network.signal_dbm} dBm` : ''} · {clientCount} client{clientCount !== 1 ? 's' : ''}
      </div>
      {network.is_evil_twin && <div className="text-xs font-semibold text-red-400">⚠ Evil Twin</div>}
    </div>
  );
}

function ClientBubble({ client, index }: { client: ClientEntry; index: number }) {
  const col = deviceTypeColor(client.device_type);
  const alert = isAlertDeviceType(client.device_type);

  return (
    <div
      className="flex w-24 flex-col items-center gap-1.5 opacity-0"
      style={{ animation: 'bubble-in 380ms ease-out forwards', animationDelay: `${index * 60}ms` }}
    >
      <span
        className="flex h-16 w-16 items-center justify-center rounded-full border-2 text-2xl"
        style={{ borderColor: alert ? '#dc2626' : col, background: `${col}1a` }}
      >
        {deviceIcon(client.device_type)}
      </span>
      <span className="w-full truncate text-center text-xs font-semibold text-text">{client.vendor || 'Unknown'}</span>
      <span className="w-full truncate text-center text-[10px]" style={{ color: col }}>
        {client.device_type}
      </span>
      <span className="w-full truncate text-center text-[9px] font-mono text-text-muted/70">…{client.mac.slice(-8)}</span>
    </div>
  );
}

const TRANSITION_MS = 180;

export function MapPanel({ networks }: MapPanelProps) {
  const [selectedBssid, setSelectedBssid] = useState<string | null>(null);
  const [entered, setEntered] = useState(true);

  if (!networks.length) {
    return <div className="py-12 text-center text-text-muted">No network data to display.</div>;
  }

  const selected = networks.find((n) => n.bssid === selectedBssid) || null;

  const swapTo = (next: string | null) => {
    setEntered(false);
    setTimeout(() => {
      setSelectedBssid(next);
      requestAnimationFrame(() => setEntered(true));
    }, TRANSITION_MS);
  };

  return (
    <div className="py-3">
      <div className="mb-3 flex flex-wrap items-center gap-3 text-[11px] text-text-muted">
        <strong className="uppercase tracking-wide">Encryption:</strong>
        {Object.entries(ENC_COLOR).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: v }} />
            {k}
          </span>
        ))}
        <strong className="uppercase tracking-wide">Device:</strong>
        {DT_LEGEND.map(([k, v]) => (
          <span key={k} className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: v }} />
            {k}
          </span>
        ))}
      </div>

      <div
        className={`rounded-xl border border-border bg-surface p-8 transition-all ease-out ${
          entered ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        style={{ transitionDuration: `${TRANSITION_MS}ms` }}
      >
        {!selected ? (
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-8">
            {networks.map((net) => (
              <NetworkBubble key={net.bssid} network={net} onClick={() => swapTo(net.bssid)} />
            ))}
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => swapTo(null)}
              className="mb-6 flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-primary"
            >
              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                <path d="M10 13L5 8l5-5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              All networks
            </button>

            <SelectedNetworkHeader network={selected} />

            {(selected.clients || []).length > 0 ? (
              <div className="mt-8 flex flex-wrap justify-center gap-6">
                {selected.clients.map((c, i) => (
                  <ClientBubble key={c.mac} client={c} index={i} />
                ))}
              </div>
            ) : (
              <div className="mt-8 text-center text-sm text-text-muted">No clients observed for this network</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
