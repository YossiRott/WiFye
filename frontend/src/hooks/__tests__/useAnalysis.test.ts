import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { analyzeFile } from '../../api/endpoints';
import { useAnalysis } from '../useAnalysis';

vi.mock('../../api/endpoints', () => ({
  analyzeFile: vi.fn(),
}));

const EMPTY_RESPONSE = {
  summary: { total_aps: 0, total_clients: 0, total_packets: 0, scan_duration: '' },
  networks: [],
  probes: [],
  deauth_floods: [],
  evil_twins: [],
  channel_usage: {},
  hashes: [],
};

describe('useAnalysis', () => {
  beforeEach(() => vi.resetAllMocks());

  it('starts idle', () => {
    const { result } = renderHook(() => useAnalysis());
    expect(result.current.status).toBe('idle');
    expect(result.current.data).toBeNull();
  });

  it('transitions idle -> loading -> done on a successful analysis', async () => {
    vi.mocked(analyzeFile).mockResolvedValue(EMPTY_RESPONSE);
    const { result } = renderHook(() => useAnalysis());

    const file = new File(['data'], 'test.pcap');
    act(() => {
      result.current.analyze(file);
    });
    expect(result.current.status).toBe('loading');
    expect(result.current.fileName).toBe('test.pcap');

    await waitFor(() => expect(result.current.status).toBe('done'));
    expect(result.current.data).toEqual(EMPTY_RESPONSE);
  });

  it('transitions to error when the response body has an error field', async () => {
    vi.mocked(analyzeFile).mockResolvedValue({ ...EMPTY_RESPONSE, error: 'Parser failed' });
    const { result } = renderHook(() => useAnalysis());

    act(() => {
      result.current.analyze(new File(['x'], 'bad.pcap'));
    });

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('Parser failed');
    expect(result.current.data).toBeNull();
  });

  it('transitions to error when the request rejects', async () => {
    vi.mocked(analyzeFile).mockRejectedValue(new Error('Network down'));
    const { result } = renderHook(() => useAnalysis());

    act(() => {
      result.current.analyze(new File(['x'], 'bad.pcap'));
    });

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('Network down');
  });

  it('reset() returns to idle and clears data/error', async () => {
    vi.mocked(analyzeFile).mockResolvedValue(EMPTY_RESPONSE);
    const { result } = renderHook(() => useAnalysis());

    act(() => {
      result.current.analyze(new File(['x'], 'a.pcap'));
    });
    await waitFor(() => expect(result.current.status).toBe('done'));

    act(() => result.current.reset());
    expect(result.current.status).toBe('idle');
    expect(result.current.data).toBeNull();
    expect(result.current.fileName).toBeNull();
  });
});
