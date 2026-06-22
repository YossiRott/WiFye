import type { DeauthFlood, EvilTwin } from '../../../api/types';
import { ChannelChart } from './ChannelChart';

interface InsightsPanelProps {
  evilTwins: EvilTwin[];
  deauthFloods: DeauthFlood[];
  channelUsage: Record<string, number>;
}

export function InsightsPanel({ evilTwins, deauthFloods, channelUsage }: InsightsPanelProps) {
  const hasAlerts = evilTwins.length > 0 || deauthFloods.length > 0;

  return (
    <div className="flex flex-col gap-3 py-3">
      {!hasAlerts && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <div className="font-semibold text-emerald-400">✓ No Security Alerts</div>
          <div className="mt-1 text-sm text-text-muted">No evil twins or deauth floods detected in this capture.</div>
        </div>
      )}
      {evilTwins.map((et) => (
        <div key={et.ssid} className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="font-semibold text-amber-400">⚠ Evil Twin — "{et.ssid}"</div>
          <div className="mt-1 text-sm text-text-muted">
            Multiple access points are broadcasting this SSID with different BSSIDs.
            <br />
            {et.bssids.join('  ·  ')}
          </div>
        </div>
      ))}
      {deauthFloods.map((df) => (
        <div key={df.src_mac} className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <div className="font-semibold text-red-400">
            ⚡ Deauth Flood — <span className="font-mono">{df.src_mac}</span>
          </div>
          <div className="mt-1 text-sm text-text-muted">
            {df.vendor} sent <strong>{df.count}</strong> deauthentication frames. This may indicate a jamming or
            de-association attack in progress.
          </div>
        </div>
      ))}
      <ChannelChart channelUsage={channelUsage} />
    </div>
  );
}
