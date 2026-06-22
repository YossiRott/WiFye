import type { ProbeEntry } from '../../../api/types';

interface ProbesPanelProps {
  probes: ProbeEntry[];
}

export function ProbesPanel({ probes }: ProbesPanelProps) {
  if (!probes.length) {
    return (
      <div className="py-12 text-center text-text-muted">
        <p>No probe requests captured.</p>
        <p className="mt-1 text-xs">Probe requests are sent by devices searching for known networks.</p>
      </div>
    );
  }

  const totalSsids = probes.reduce((sum, p) => sum + p.probed_ssids.length, 0);

  return (
    <div className="overflow-x-auto py-3">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-text-muted">
            <th className="py-2 pr-3 font-medium">Client MAC</th>
            <th className="py-2 pr-3 font-medium">Vendor</th>
            <th className="py-2 pr-3 font-medium">Device Type</th>
            <th className="py-2 pr-3 font-medium">Probed SSIDs ({totalSsids} total)</th>
          </tr>
        </thead>
        <tbody>
          {probes.map((p) => (
            <tr key={p.client_mac} className="border-b border-border/50">
              <td className="py-2 pr-3 font-mono text-xs text-text">{p.client_mac}</td>
              <td className="py-2 pr-3 text-text-muted">{p.vendor}</td>
              <td className="py-2 pr-3 text-text-muted">{p.device_type}</td>
              <td className="py-2 pr-3">
                <div className="flex flex-wrap gap-1">
                  {p.probed_ssids.map((s) => (
                    <span key={s} className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-text">
                      {s}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
