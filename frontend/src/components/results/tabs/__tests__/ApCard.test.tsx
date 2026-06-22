import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { NetworkEntry } from '../../../../api/types';
import { ApCard } from '../ApCard';

const network: NetworkEntry = {
  ssid: 'HomeNet',
  bssid: 'AA:BB:CC:DD:EE:FF',
  channel: 6,
  encryption: 'WPA2',
  signal_dbm: -50,
  first_seen: null,
  last_seen: null,
  is_evil_twin: false,
  clients: [{ mac: '11:22:33:44:55:66', vendor: 'Apple', device_type: 'iPhone', signal_dbm: -60 }],
};

describe('ApCard', () => {
  it('renders network info and starts collapsed', () => {
    render(<ApCard network={network} />);
    expect(screen.getByText('HomeNet')).toBeInTheDocument();
    expect(screen.queryByText('11:22:33:44:55:66')).not.toBeInTheDocument();
  });

  it('expands to show clients on click, and collapses again on a second click', () => {
    render(<ApCard network={network} />);
    const header = screen.getByText('HomeNet').closest('button')!;

    fireEvent.click(header);
    expect(screen.getByText('11:22:33:44:55:66')).toBeInTheDocument();

    fireEvent.click(header);
    expect(screen.queryByText('11:22:33:44:55:66')).not.toBeInTheDocument();
  });

  it('shows a no-clients message when the network has no observed clients', () => {
    render(<ApCard network={{ ...network, clients: [] }} />);
    fireEvent.click(screen.getByText('HomeNet').closest('button')!);
    expect(screen.getByText('No clients observed for this network')).toBeInTheDocument();
  });

  it('shows an Evil Twin badge when is_evil_twin is true', () => {
    render(<ApCard network={{ ...network, is_evil_twin: true }} />);
    expect(screen.getByText('Evil Twin')).toBeInTheDocument();
  });
});
