import { useEffect } from 'react';
import type { HashEntry } from '../../../api/types';
import { downloadText } from '../../../utils/download';
import type { UseCrackingReturn } from '../../../hooks/useCracking';
import { Button } from '../../common/Button';
import { CrackPanel } from '../../crack/CrackPanel';
import { HashRow } from './HashRow';

interface HashesPanelProps {
  hashes: HashEntry[];
  cracking: UseCrackingReturn;
}

export function HashesPanel({ hashes, cracking }: HashesPanelProps) {
  const hasHashes = hashes.length > 0;

  useEffect(() => {
    if (hasHashes) {
      cracking.loadWordlists();
      cracking.checkWordgen();
    }
    // Only re-run when hashes go from none -> some (new analysis), not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHashes]);

  if (!hasHashes) {
    return (
      <div className="py-12 text-center text-text-muted">
        <p>No WPA handshakes captured in this file.</p>
        <p className="mt-1 text-xs">Handshakes are captured when a client connects to a network.</p>
      </div>
    );
  }

  const downloadAll = () => {
    downloadText(hashes.map((h) => h.hash_22000).join('\n') + '\n', 'wifye_hashes.22000');
  };

  return (
    <div className="flex flex-col gap-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-text-muted">Hashcat 22000 — WPA*01* PMKID · WPA*02* EAPOL</span>
        <Button variant="outline" size="sm" onClick={downloadAll}>
          Download all (.22000)
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        {hashes.map((h, i) => (
          <HashRow key={`${h.bssid}-${h.client_mac}-${h.hash_type}-${i}`} hash={h} />
        ))}
      </div>
      <CrackPanel hashes={hashes} cracking={cracking} />
    </div>
  );
}
