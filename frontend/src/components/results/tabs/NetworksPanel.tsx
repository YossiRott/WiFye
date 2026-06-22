import type { NetworkEntry } from '../../../api/types';
import { ApCard } from './ApCard';

interface NetworksPanelProps {
  networks: NetworkEntry[];
}

export function NetworksPanel({ networks }: NetworksPanelProps) {
  if (!networks.length) {
    return (
      <div className="py-12 text-center text-text-muted">
        <p>No WiFi networks found in this capture.</p>
        <p className="mt-1 text-xs">Make sure the file contains 802.11 frames in monitor mode.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 py-3">
      {networks.map((net) => (
        <ApCard key={net.bssid} network={net} />
      ))}
    </div>
  );
}
