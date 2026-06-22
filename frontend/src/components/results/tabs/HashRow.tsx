import { useState } from 'react';
import type { HashEntry } from '../../../api/types';
import { sanitizeFilename } from '../../../utils/format';
import { downloadText } from '../../../utils/download';
import { Badge } from '../../common/Badge';
import { Button } from '../../common/Button';

interface HashRowProps {
  hash: HashEntry;
}

export function HashRow({ hash }: HashRowProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(hash.hash_22000).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    downloadText(hash.hash_22000 + '\n', `${sanitizeFilename(hash.ssid)}_${hash.bssid.replace(/:/g, '')}.22000`);
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-text">{hash.ssid}</span>
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-text-muted">AP {hash.bssid}</span>
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-text-muted">Client {hash.client_mac}</span>
        <Badge
          className={
            hash.hash_type === 'PMKID'
              ? 'border-purple-500/30 bg-purple-500/10 text-purple-300'
              : 'border-sky-500/30 bg-sky-500/10 text-sky-300'
          }
        >
          {hash.hash_type || 'EAPOL'}
        </Badge>
        <Badge
          className={
            hash.has_full_handshake
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
          }
        >
          {hash.has_full_handshake ? 'Full' : 'Partial'}
        </Badge>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1 overflow-x-auto rounded-lg bg-surface-2 p-2 font-mono text-[11px] text-text-muted">
          {hash.hash_22000}
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            .22000
          </Button>
        </div>
      </div>
    </div>
  );
}
