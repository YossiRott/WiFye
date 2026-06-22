import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { NetworkEntry } from '../../api/types';
import { useNetworkFilterSort } from '../useNetworkFilterSort';

function net(overrides: Partial<NetworkEntry>): NetworkEntry {
  return {
    ssid: 'Net',
    bssid: '00:00:00:00:00:01',
    channel: 1,
    encryption: 'WPA2',
    signal_dbm: -50,
    first_seen: null,
    last_seen: null,
    clients: [],
    is_evil_twin: false,
    ...overrides,
  };
}

describe('useNetworkFilterSort', () => {
  it('sorts by client count descending by default', () => {
    const networks = [
      net({ ssid: 'A', bssid: '1', clients: [{ mac: 'x', vendor: 'v', device_type: 'd', signal_dbm: null }] }),
      net({ ssid: 'B', bssid: '2', clients: [] }),
    ];
    const { result } = renderHook(() => useNetworkFilterSort(networks));
    expect(result.current.filteredSorted.map((n) => n.ssid)).toEqual(['A', 'B']);
  });

  it('sorts by signal strength when sortKey is signal', () => {
    const networks = [net({ ssid: 'Weak', bssid: '1', signal_dbm: -80 }), net({ ssid: 'Strong', bssid: '2', signal_dbm: -40 })];
    const { result } = renderHook(() => useNetworkFilterSort(networks));
    act(() => result.current.setSortKey('signal'));
    expect(result.current.filteredSorted.map((n) => n.ssid)).toEqual(['Strong', 'Weak']);
  });

  it('sorts alphabetically by name', () => {
    const networks = [net({ ssid: 'Zebra', bssid: '1' }), net({ ssid: 'Alpha', bssid: '2' })];
    const { result } = renderHook(() => useNetworkFilterSort(networks));
    act(() => result.current.setSortKey('name'));
    expect(result.current.filteredSorted.map((n) => n.ssid)).toEqual(['Alpha', 'Zebra']);
  });

  it('sorts by encryption strength order when sortKey is enc', () => {
    const networks = [net({ ssid: 'OpenNet', bssid: '1', encryption: 'Open' }), net({ ssid: 'SecureNet', bssid: '2', encryption: 'WPA3' })];
    const { result } = renderHook(() => useNetworkFilterSort(networks));
    act(() => result.current.setSortKey('enc'));
    expect(result.current.filteredSorted.map((n) => n.ssid)).toEqual(['SecureNet', 'OpenNet']);
  });

  it('filters by ssid or bssid search text, case-insensitively', () => {
    const networks = [net({ ssid: 'HomeNet', bssid: 'AA:BB:CC:DD:EE:FF' }), net({ ssid: 'OfficeNet', bssid: '11:22:33:44:55:66' })];
    const { result } = renderHook(() => useNetworkFilterSort(networks));
    act(() => result.current.setSearchText('HOME'));
    expect(result.current.filteredSorted.map((n) => n.ssid)).toEqual(['HomeNet']);
  });

  it('matches search text against bssid too', () => {
    const networks = [net({ ssid: 'HomeNet', bssid: 'AA:BB:CC:DD:EE:FF' }), net({ ssid: 'OfficeNet', bssid: '11:22:33:44:55:66' })];
    const { result } = renderHook(() => useNetworkFilterSort(networks));
    act(() => result.current.setSearchText('11:22'));
    expect(result.current.filteredSorted.map((n) => n.ssid)).toEqual(['OfficeNet']);
  });
});
