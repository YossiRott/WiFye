import type { SortKey } from '../../hooks/useNetworkFilterSort';
import { Button } from '../common/Button';

interface ToolbarProps {
  sortKey: SortKey;
  onSortChange: (key: SortKey) => void;
  searchText: string;
  onSearchChange: (text: string) => void;
  onExportJson: () => void;
  onExportCsv: () => void;
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'clients', label: 'Clients' },
  { key: 'signal', label: 'Signal' },
  { key: 'name', label: 'Name' },
  { key: 'enc', label: 'Security' },
];

export function Toolbar({ sortKey, onSortChange, searchText, onSearchChange, onExportJson, onExportCsv }: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-muted">Sort:</span>
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => onSortChange(opt.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              sortKey === opt.key ? 'bg-primary text-zinc-950' : 'bg-surface text-text-muted hover:text-text'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search SSID or BSSID…"
          autoComplete="off"
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text placeholder:text-text-muted/60 focus:border-primary/50 focus:outline-none"
        />
        <Button variant="outline" size="sm" onClick={onExportJson}>
          JSON
        </Button>
        <Button variant="outline" size="sm" onClick={onExportCsv}>
          CSV
        </Button>
      </div>
    </div>
  );
}
