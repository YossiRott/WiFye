import type { DeauthFlood, EvilTwin } from '../../api/types';

interface AlertBannersProps {
  evilTwins: EvilTwin[];
  deauthFloods: DeauthFlood[];
}

export function AlertBanners({ evilTwins, deauthFloods }: AlertBannersProps) {
  if (!evilTwins.length && !deauthFloods.length) return null;

  return (
    <div className="flex flex-col gap-2">
      {evilTwins.map((et) => (
        <div
          key={et.ssid}
          className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 shrink-0">
            <path d="M10 3L2 17h16L10 3z" stroke="#ca8a04" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M10 9v4M10 14.5v.5" stroke="#ca8a04" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <span>
            <strong>Evil Twin:</strong> "{et.ssid}" broadcast by {et.bssids.length} different BSSIDs
          </span>
        </div>
      ))}
      {deauthFloods.map((df) => (
        <div
          key={df.src_mac}
          className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 shrink-0">
            <circle cx="10" cy="10" r="8" stroke="#dc2626" strokeWidth="1.8" />
            <path d="M10 6v5M10 13.5v.5" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <span>
            <strong>Deauth Flood:</strong> {df.src_mac} ({df.vendor}) — {df.count} frames
          </span>
        </div>
      ))}
    </div>
  );
}
