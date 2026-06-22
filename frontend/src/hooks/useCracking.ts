import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clearCrack as apiClearCrack,
  getCrackStatus,
  getCrackWordlists,
  getWordgenPath,
  startCrack as apiStartCrack,
  stopCrack as apiStopCrack,
} from '../api/endpoints';
import type { CrackedPassword, CrackStats, CrackStatusResponse, WordlistEntry, Workload } from '../api/types';

export type DictSource = 'system' | 'upload' | 'wordgen';

export interface SelectedDict {
  path: string;
  name: string;
  source: DictSource;
  isDefault: boolean;
}

export type CrackPhase = 'config' | 'console';

const POLL_INTERVAL_MS = 2000;

export function useCracking() {
  const [wordlists, setWordlists] = useState<WordlistEntry[]>([]);
  const [wordlistsLoaded, setWordlistsLoaded] = useState(false);
  const [selectedDicts, setSelectedDicts] = useState<SelectedDict[]>([]);
  const [wordgenPath, setWordgenPath] = useState<string | null>(null);
  const [workload, setWorkload] = useState<Workload>('3');

  const [phase, setPhase] = useState<CrackPhase>('config');
  const [status, setStatus] = useState<CrackStatusResponse['status']>('idle');
  const [done, setDone] = useState(false);
  const [stats, setStats] = useState<CrackStats>({});
  const [cracked, setCracked] = useState<CrackedPassword[]>([]);
  const [startError, setStartError] = useState<string | null>(null);

  const outputLineRef = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const loadWordlists = useCallback(async () => {
    try {
      const items = await getCrackWordlists();
      setWordlists(items);
      setSelectedDicts((prev) => {
        const next = [...prev];
        for (const it of items) {
          if (it.is_default && !next.find((d) => d.path === it.path)) {
            next.push({ path: it.path, name: it.name, source: 'system', isDefault: true });
          }
        }
        return next;
      });
    } catch {
      setWordlists([]);
    } finally {
      setWordlistsLoaded(true);
    }
  }, []);

  const checkWordgen = useCallback(async () => {
    try {
      const d = await getWordgenPath();
      setWordgenPath(d.exists ? d.path : null);
    } catch {
      setWordgenPath(null);
    }
  }, []);

  const insertDict = useCallback((entry: SelectedDict) => {
    setSelectedDicts((prev) => {
      if (prev.find((d) => d.path === entry.path)) return prev;
      if (entry.isDefault) return [...prev, entry];
      const defIdx = prev.findIndex((d) => d.isDefault);
      if (defIdx === -1) return [...prev, entry];
      const next = [...prev];
      next.splice(defIdx, 0, entry);
      return next;
    });
  }, []);

  const toggleDict = useCallback(
    (entry: SelectedDict, checked: boolean) => {
      if (checked) insertDict(entry);
      else setSelectedDicts((prev) => prev.filter((d) => d.path !== entry.path));
    },
    [insertDict],
  );

  const removeDict = useCallback((path: string) => {
    setSelectedDicts((prev) => prev.filter((d) => d.path !== path));
  }, []);

  const useWordgenList = useCallback(() => {
    if (!wordgenPath) return;
    insertDict({ path: wordgenPath, name: 'Generated Wordlist', source: 'wordgen', isDefault: false });
  }, [wordgenPath, insertDict]);

  const poll = useCallback(() => {
    getCrackStatus(outputLineRef.current)
      .then((d) => {
        outputLineRef.current = d.total || outputLineRef.current;
        setStats(d.stats || {});
        if (d.done) {
          stopPolling();
          setStatus(d.status);
          setDone(true);
          setCracked(d.cracked || []);
        }
      })
      .catch(() => {});
  }, [stopPolling]);

  const start = useCallback(
    async (hashLines: string[]) => {
      if (!selectedDicts.length) {
        setStartError('Select at least one dictionary first.');
        return;
      }
      setStartError(null);
      outputLineRef.current = 0;
      setCracked([]);
      setStats({});
      setDone(false);
      setStatus('running');
      setPhase('console');

      try {
        const result = await apiStartCrack({
          hashes: hashLines,
          wordlists: selectedDicts.map((d) => d.path),
          workload,
        });
        if (result.error) {
          setStartError(result.error);
          setPhase('config');
          return;
        }
        stopPolling();
        pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
      } catch {
        setStartError('Failed to start');
        setPhase('config');
      }
    },
    [selectedDicts, workload, poll, stopPolling],
  );

  const stop = useCallback(() => {
    apiStopCrack().catch(() => {});
    stopPolling();
    setStatus('stopped');
    setDone(true);
  }, [stopPolling]);

  const clear = useCallback(() => {
    stopPolling();
    apiClearCrack().catch(() => {});
    setCracked([]);
    setStats({});
    setStatus('idle');
    setDone(false);
    setPhase('config');
    setSelectedDicts([]);
    setWordlistsLoaded(false);
    loadWordlists();
  }, [stopPolling, loadWordlists]);

  return {
    wordlists,
    wordlistsLoaded,
    selectedDicts,
    wordgenPath,
    workload,
    setWorkload,
    phase,
    status,
    done,
    stats,
    cracked,
    startError,
    loadWordlists,
    checkWordgen,
    toggleDict,
    removeDict,
    useWordgenList,
    start,
    stop,
    clear,
  };
}

export type UseCrackingReturn = ReturnType<typeof useCracking>;
