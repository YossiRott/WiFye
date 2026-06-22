import { useState } from 'react';
import type { HashEntry } from '../../api/types';
import type { UseCrackingReturn } from '../../hooks/useCracking';
import { Button } from '../common/Button';
import { CrackConsole } from './CrackConsole';
import { DictionarySelector } from './DictionarySelector';
import { WorkloadSelector } from './WorkloadSelector';

interface CrackPanelProps {
  hashes: HashEntry[];
  cracking: UseCrackingReturn;
}

export function CrackPanel({ hashes, cracking }: CrackPanelProps) {
  const [closed, setClosed] = useState(false);

  if (closed) return null;

  return (
    <div className="rounded-xl border border-primary/20 bg-surface">
      <div className="flex items-center justify-between border-b border-border p-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-text">
          <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
            <path d="M16 8a6 6 0 1 1-12 0 6 6 0 0 1 12 0z" stroke="#e8a020" strokeWidth="1.8" />
            <path d="M14 14l4 4" stroke="#e8a020" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Crack with Hashcat
        </div>
        <Button variant="ghost" size="sm" onClick={() => setClosed(true)}>
          ✕
        </Button>
      </div>

      <div className="p-3">
        {cracking.phase === 'config' ? (
          <div className="flex flex-col gap-4">
            <DictionarySelector
              wordlists={cracking.wordlists}
              selectedDicts={cracking.selectedDicts}
              onToggle={cracking.toggleDict}
              onRemove={cracking.removeDict}
              wordgenAvailable={!!cracking.wordgenPath}
              onUseWordgen={cracking.useWordgenList}
            />
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">CPU/GPU Workload</div>
              <WorkloadSelector value={cracking.workload} onChange={cracking.setWorkload} />
            </div>
            <p className="text-xs text-text-muted">
              Uses CPU + GPU (-D 1,2) with optimized kernels (-O). Requires hashcat in PATH.
            </p>
            {cracking.startError && <p className="text-xs text-red-400">{cracking.startError}</p>}
            <Button onClick={() => cracking.start(hashes.map((h) => h.hash_22000))}>Start Cracking</Button>
          </div>
        ) : (
          <CrackConsole
            status={cracking.status}
            done={cracking.done}
            stats={cracking.stats}
            cracked={cracking.cracked}
            onStop={cracking.stop}
            onNewSearch={cracking.clear}
          />
        )}
      </div>
    </div>
  );
}
