import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../../api/endpoints';
import { useCracking } from '../useCracking';

vi.mock('../../api/endpoints');

describe('useCracking', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejects start when no dictionaries are selected', async () => {
    const { result } = renderHook(() => useCracking());

    await act(async () => {
      await result.current.start(['hash1']);
    });

    expect(result.current.startError).toBe('Select at least one dictionary first.');
    expect(api.startCrack).not.toHaveBeenCalled();
  });

  it('auto-selects default wordlists (e.g. rockyou) on loadWordlists()', async () => {
    vi.mocked(api.getCrackWordlists).mockResolvedValue([
      { path: '/wl/custom.txt', name: 'custom.txt', size: '1 KB', is_default: false },
      { path: '/wl/rockyou.txt', name: 'rockyou.txt', size: '100 MB', is_default: true },
    ]);

    const { result } = renderHook(() => useCracking());
    await act(async () => {
      await result.current.loadWordlists();
    });

    expect(result.current.wordlistsLoaded).toBe(true);
    expect(result.current.selectedDicts).toEqual([
      { path: '/wl/rockyou.txt', name: 'rockyou.txt', source: 'system', isDefault: true },
    ]);
  });

  it('polls status every 2s while running and stops polling once done', async () => {
    vi.useFakeTimers();
    vi.mocked(api.getCrackWordlists).mockResolvedValue([
      { path: '/wl.txt', name: 'wl.txt', size: '1 KB', is_default: true },
    ]);
    vi.mocked(api.startCrack).mockResolvedValue({ started: true, cmd: 'hashcat ...' });
    vi.mocked(api.getCrackStatus)
      .mockResolvedValueOnce({ status: 'running', output: [], total: 0, done: false, cracked: [], stats: { progress: 10 } })
      .mockResolvedValueOnce({
        status: 'done',
        output: [],
        total: 0,
        done: true,
        cracked: [{ ssid: 'Net', password: 'pw' }],
        stats: { progress: 100 },
      });

    const { result } = renderHook(() => useCracking());
    await act(async () => {
      await result.current.loadWordlists();
    });
    await act(async () => {
      await result.current.start(['hash1']);
    });

    expect(api.startCrack).toHaveBeenCalledTimes(1);
    expect(result.current.phase).toBe('console');
    expect(result.current.done).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(api.getCrackStatus).toHaveBeenCalledTimes(1);
    expect(result.current.done).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(result.current.done).toBe(true);
    expect(result.current.cracked).toEqual([{ ssid: 'Net', password: 'pw' }]);

    const callsAfterDone = vi.mocked(api.getCrackStatus).mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(vi.mocked(api.getCrackStatus).mock.calls.length).toBe(callsAfterDone);
  });

  it('stop() halts polling immediately and marks status stopped', async () => {
    vi.useFakeTimers();
    vi.mocked(api.getCrackWordlists).mockResolvedValue([
      { path: '/wl.txt', name: 'wl.txt', size: '1 KB', is_default: true },
    ]);
    vi.mocked(api.startCrack).mockResolvedValue({ started: true });
    vi.mocked(api.getCrackStatus).mockResolvedValue({
      status: 'running',
      output: [],
      total: 0,
      done: false,
      cracked: [],
      stats: {},
    });
    vi.mocked(api.stopCrack).mockResolvedValue({ stopped: true });

    const { result } = renderHook(() => useCracking());
    await act(async () => {
      await result.current.loadWordlists();
    });
    await act(async () => {
      await result.current.start(['hash1']);
    });

    act(() => {
      result.current.stop();
    });
    expect(result.current.status).toBe('stopped');
    expect(result.current.done).toBe(true);
    expect(api.stopCrack).toHaveBeenCalledTimes(1);

    const callCountAtStop = vi.mocked(api.getCrackStatus).mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(vi.mocked(api.getCrackStatus).mock.calls.length).toBe(callCountAtStop);
  });

  it('clear() resets to config phase and reloads wordlists', async () => {
    vi.mocked(api.getCrackWordlists).mockResolvedValue([]);
    vi.mocked(api.clearCrack).mockResolvedValue({ cleared: true });

    const { result } = renderHook(() => useCracking());
    await act(async () => {
      await result.current.loadWordlists();
    });

    await act(async () => {
      result.current.clear();
    });

    expect(result.current.phase).toBe('config');
    expect(result.current.status).toBe('idle');
    expect(result.current.selectedDicts).toEqual([]);
    expect(api.clearCrack).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(api.getCrackWordlists).toHaveBeenCalledTimes(2));
  });
});
