import { useState } from 'react';
import type { AnalyzeResponse } from '../../api/types';
import type { UseCrackingReturn } from '../../hooks/useCracking';
import { useNetworkFilterSort } from '../../hooks/useNetworkFilterSort';
import { downloadText } from '../../utils/download';
import { Button } from '../common/Button';
import { AlertBanners } from './AlertBanners';
import { StatsRow } from './StatsRow';
import { Toolbar } from './Toolbar';
import { HashesPanel } from './tabs/HashesPanel';
import { InsightsPanel } from './tabs/InsightsPanel';
import { MapPanel } from './tabs/MapPanel';
import { NetworksPanel } from './tabs/NetworksPanel';
import { ProbesPanel } from './tabs/ProbesPanel';
import { TabBar, type TabKey } from './tabs/TabBar';

interface ResultsSectionProps {
  data: AnalyzeResponse;
  cracking: UseCrackingReturn;
  onReset: () => void;
}

function exportJson(data: AnalyzeResponse) {
  downloadText(JSON.stringify(data, null, 2), 'wifye_analysis.json');
}

function exportCsv(data: AnalyzeResponse) {
  const rows: (string | number)[][] = [
    ['SSID', 'BSSID', 'Channel', 'Encryption', 'Signal_dBm', 'Clients', 'First_Seen', 'Last_Seen', 'Evil_Twin'],
  ];
  (data.networks || []).forEach((ap) => {
    rows.push([
      ap.ssid,
      ap.bssid,
      ap.channel ?? '',
      ap.encryption,
      ap.signal_dbm ?? '',
      (ap.clients || []).length,
      ap.first_seen ?? '',
      ap.last_seen ?? '',
      ap.is_evil_twin ? 'yes' : 'no',
    ]);
  });
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  downloadText(csv, 'wifye_networks.csv');
}

export function ResultsSection({ data, cracking, onReset }: ResultsSectionProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('networks');
  const networks = data.networks || [];
  const hashes = data.hashes || [];
  const probes = data.probes || [];
  const floods = data.deauth_floods || [];
  const twins = data.evil_twins || [];

  const { sortKey, setSortKey, searchText, setSearchText, filteredSorted } = useNetworkFilterSort(networks);

  return (
    <section className="flex flex-col gap-4 py-6">
      <StatsRow summary={data.summary} />
      <AlertBanners evilTwins={twins} deauthFloods={floods} />
      <Toolbar
        sortKey={sortKey}
        onSortChange={setSortKey}
        searchText={searchText}
        onSearchChange={setSearchText}
        onExportJson={() => exportJson(data)}
        onExportCsv={() => exportCsv(data)}
      />
      <TabBar
        active={activeTab}
        onChange={setActiveTab}
        counts={{ networks: networks.length, hashes: hashes.length, probes: probes.length, alerts: floods.length + twins.length }}
      />

      <div className={activeTab === 'networks' ? '' : 'hidden'}>
        <NetworksPanel networks={filteredSorted} />
      </div>
      <div className={activeTab === 'hashes' ? '' : 'hidden'}>
        <HashesPanel hashes={hashes} cracking={cracking} />
      </div>
      <div className={activeTab === 'probes' ? '' : 'hidden'}>
        <ProbesPanel probes={probes} />
      </div>
      <div className={activeTab === 'insights' ? '' : 'hidden'}>
        <InsightsPanel evilTwins={twins} deauthFloods={floods} channelUsage={data.channel_usage || {}} />
      </div>
      <div className={activeTab === 'map' ? '' : 'hidden'}>
        <MapPanel networks={networks} />
      </div>

      <div className="flex justify-center pt-2">
        <Button variant="outline" onClick={onReset}>
          Analyze another file
        </Button>
      </div>
    </section>
  );
}
