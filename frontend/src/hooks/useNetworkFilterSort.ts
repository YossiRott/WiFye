import { useMemo, useState } from 'react';
import type { NetworkEntry } from '../api/types';

export type SortKey = 'clients' | 'signal' | 'name' | 'enc';

const ENC_ORDER: Record<string, number> = { WPA3: 0, WPA2: 1, WPA: 2, WEP: 3, Open: 4, Unknown: 5 };

export function useNetworkFilterSort(networks: NetworkEntry[]) {
  const [sortKey, setSortKey] = useState<SortKey>('clients');
  const [searchText, setSearchText] = useState('');

  const filteredSorted = useMemo(() => {
    const text = searchText.toLowerCase();
    const filtered = networks.filter(
      (ap) => !text || ap.ssid.toLowerCase().includes(text) || ap.bssid.toLowerCase().includes(text),
    );

    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'clients':
          return (b.clients?.length ?? 0) - (a.clients?.length ?? 0);
        case 'signal':
          return (b.signal_dbm ?? -200) - (a.signal_dbm ?? -200);
        case 'name':
          return a.ssid.localeCompare(b.ssid);
        case 'enc':
          return (ENC_ORDER[a.encryption] ?? 5) - (ENC_ORDER[b.encryption] ?? 5);
        default:
          return 0;
      }
    });
  }, [networks, sortKey, searchText]);

  return { sortKey, setSortKey, searchText, setSearchText, filteredSorted };
}
