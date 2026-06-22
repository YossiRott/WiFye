export type TabKey = 'networks' | 'hashes' | 'probes' | 'insights' | 'map';

interface TabBarProps {
  active: TabKey;
  onChange: (tab: TabKey) => void;
  counts: { networks: number; hashes: number; probes: number; alerts: number };
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'networks', label: 'Networks' },
  { key: 'hashes', label: 'Hashes' },
  { key: 'probes', label: 'Probes' },
  { key: 'insights', label: 'Insights' },
  { key: 'map', label: 'Map' },
];

export function TabBar({ active, onChange, counts }: TabBarProps) {
  const badgeFor = (key: TabKey): number | null => {
    switch (key) {
      case 'networks':
        return counts.networks;
      case 'hashes':
        return counts.hashes;
      case 'probes':
        return counts.probes;
      case 'insights':
        return counts.alerts;
      default:
        return null;
    }
  };

  return (
    <div className="flex gap-1 overflow-x-auto border-b border-border">
      {TABS.map((tab) => {
        const badge = badgeFor(tab.key);
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {tab.label}
            {badge !== null && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                  isActive ? 'bg-primary/20 text-primary' : 'bg-surface-2 text-text-muted'
                }`}
              >
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
