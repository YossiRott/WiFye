import { useCallback, useState } from 'react';
import { generateWordlist } from '../api/endpoints';
import type { WordgenOptions } from '../api/types';
import { downloadText } from '../utils/download';

export function useWordgen(onGenerated?: () => void) {
  const [count, setCount] = useState<number | null>(null);
  const [preview, setPreview] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (seeds: string[], options: WordgenOptions) => {
      if (!seeds.length) {
        setError('Enter at least one seed word.');
        return;
      }
      try {
        const d = await generateWordlist({ seeds, options });
        if (d.error) {
          setError(d.error);
          return;
        }
        setError(null);
        setCount(d.count);
        setPreview(d.preview);
        onGenerated?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error generating wordlist');
      }
    },
    [onGenerated],
  );

  const downloadFull = useCallback(async (seeds: string[], options: WordgenOptions) => {
    if (!seeds.length) return;
    const d = await generateWordlist({ seeds, options, full: true });
    if (d.words?.length) {
      downloadText(d.words.join('\n') + '\n', 'wifye_wordlist.txt');
    }
  }, []);

  return { count, preview, error, generate, downloadFull };
}
