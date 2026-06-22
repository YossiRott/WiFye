import { useState } from 'react';
import { uploadDict } from '../../api/endpoints';
import type { WordlistEntry } from '../../api/types';
import type { SelectedDict } from '../../hooks/useCracking';

interface DictionarySelectorProps {
  wordlists: WordlistEntry[];
  selectedDicts: SelectedDict[];
  onToggle: (entry: SelectedDict, checked: boolean) => void;
  onRemove: (path: string) => void;
  wordgenAvailable: boolean;
  onUseWordgen: () => void;
}

export function DictionarySelector({
  wordlists,
  selectedDicts,
  onToggle,
  onRemove,
  wordgenAvailable,
  onUseWordgen,
}: DictionarySelectorProps) {
  const [uploadName, setUploadName] = useState<string | null>(null);

  const isSelected = (path: string) => selectedDicts.some((d) => d.path === path);

  const handleUpload = async (file: File) => {
    setUploadName('Uploading…');
    try {
      const data = await uploadDict(file);
      if (data.error) {
        setUploadName('Upload failed');
        return;
      }
      setUploadName(`✓ ${data.name}`);
      onToggle({ path: data.path, name: data.name, source: 'upload', isDefault: false }, true);
    } catch {
      setUploadName('Upload failed');
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Dictionary Files</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 text-xs text-text-muted">System Wordlists</div>
          <div className="scrollbar-thin max-h-40 overflow-y-auto rounded-lg border border-border">
            {wordlists.length === 0 ? (
              <div className="p-3 text-xs text-text-muted">Scanning…</div>
            ) : (
              wordlists.map((wl) => (
                <label
                  key={wl.path}
                  className="flex items-center gap-2 border-b border-border/50 px-2 py-1.5 text-xs last:border-0"
                >
                  <input
                    type="checkbox"
                    checked={isSelected(wl.path)}
                    onChange={(e) =>
                      onToggle({ path: wl.path, name: wl.name, source: 'system', isDefault: wl.is_default }, e.target.checked)
                    }
                  />
                  <span className="flex-1 truncate text-text" title={wl.path}>
                    {wl.name}
                  </span>
                  <span className="text-text-muted">{wl.size}</span>
                </label>
              ))
            )}
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-xs text-text-muted">Custom Dictionary</div>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-text-muted hover:border-primary/40">
            <span>{uploadName ?? 'Upload .txt wordlist'}</span>
            <input
              type="file"
              accept=".txt,.lst,.dict"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
            />
          </label>
          <div className="mb-1.5 mt-3 text-xs text-text-muted">Wordlist Generator Output</div>
          <button
            type="button"
            disabled={!wordgenAvailable}
            onClick={onUseWordgen}
            className="w-full rounded-lg border border-border px-3 py-2 text-xs text-text-muted hover:border-primary/40 disabled:opacity-40 disabled:hover:border-border"
          >
            Use generated wordlist
          </button>
        </div>
      </div>
      {selectedDicts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedDicts.map((d) => (
            <span key={d.path} className="flex items-center gap-1 rounded-full bg-surface-2 px-2 py-1 text-[11px] text-text">
              {d.name}
              <button type="button" onClick={() => onRemove(d.path)} className="text-text-muted hover:text-red-400">
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
