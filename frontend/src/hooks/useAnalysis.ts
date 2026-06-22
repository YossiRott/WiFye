import { useCallback, useState } from 'react';
import { analyzeFile } from '../api/endpoints';
import type { AnalyzeResponse } from '../api/types';

export type AnalysisStatus = 'idle' | 'loading' | 'error' | 'done';

export function useAnalysis() {
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [data, setData] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const analyze = useCallback(async (file: File) => {
    setStatus('loading');
    setFileName(file.name);
    setError(null);

    try {
      const result = await analyzeFile(file);
      if (result.error) {
        setError(result.error);
        setStatus('error');
        return;
      }
      setData(result);
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error. Check the server is running.');
      setStatus('error');
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setData(null);
    setError(null);
    setFileName(null);
  }, []);

  return { status, data, error, fileName, analyze, reset };
}
