import { useState } from 'react';
import type { WordgenOptions } from '../../api/types';
import { useWordgen } from '../../hooks/useWordgen';
import { Button } from '../common/Button';

interface WordlistGeneratorSectionProps {
  onGenerated: () => void;
}

const DEFAULT_OPTIONS: WordgenOptions = {
  capitals: true,
  leet: true,
  numbers: true,
  special: true,
  combos: false,
  prefixes: false,
};

const OPTION_DEFS: { key: keyof WordgenOptions; name: string; example: string }[] = [
  { key: 'capitals', name: 'Capitals', example: 'Admin, ADMIN, admin' },
  { key: 'leet', name: 'Leet Speak', example: '@dm1n, p@ssw0rd' },
  { key: 'numbers', name: 'Number Suffixes', example: 'admin1, admin123, admin2024' },
  { key: 'special', name: 'Special Chars', example: 'admin!, admin@, admin!@#' },
  { key: 'combos', name: 'Combine Words', example: 'adminpassword, password_admin' },
  { key: 'prefixes', name: 'Add Prefixes', example: '1admin, !admin, myadmin' },
];

function seedsFromText(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function WordlistGeneratorSection({ onGenerated }: WordlistGeneratorSectionProps) {
  const [seedText, setSeedText] = useState('');
  const [options, setOptions] = useState<WordgenOptions>(DEFAULT_OPTIONS);
  const wordgen = useWordgen(onGenerated);

  const toggle = (key: keyof WordgenOptions) => setOptions((o) => ({ ...o, [key]: !o[key] }));
  const copyAll = () => {
    if (wordgen.preview.length) navigator.clipboard.writeText(wordgen.preview.join('\n'));
  };

  return (
    <section className="mt-10 border-t border-border pt-8">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-text-muted">
        <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
          <rect x="2" y="5" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M6 9h8M6 12h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        Wordlist Generator
      </div>
      <div className="grid gap-6 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs text-text-muted">
            Seed Words <span className="opacity-70">(one per line)</span>
          </label>
          <textarea
            value={seedText}
            onChange={(e) => setSeedText(e.target.value)}
            placeholder={'admin\npassword\ncompany\n2024\nwifi'}
            className="h-40 w-full rounded-lg border border-border bg-surface-2 p-2 text-sm text-text placeholder:text-text-muted/50 focus:border-primary/50 focus:outline-none"
          />
        </div>
        <div>
          <div className="mb-1.5 text-xs text-text-muted">Mutation Options</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {OPTION_DEFS.map((opt) => (
              <label
                key={opt.key}
                className="flex cursor-pointer items-start gap-2 rounded-lg border border-border p-2 text-xs hover:border-primary/40"
              >
                <input type="checkbox" checked={options[opt.key]} onChange={() => toggle(opt.key)} className="mt-0.5" />
                <div>
                  <div className="font-medium text-text">{opt.name}</div>
                  <div className="text-text-muted">{opt.example}</div>
                </div>
              </label>
            ))}
          </div>

          <Button className="mt-4" onClick={() => wordgen.generate(seedsFromText(seedText), options)}>
            Generate
          </Button>

          {wordgen.error && <p className="mt-2 text-xs text-red-400">{wordgen.error}</p>}

          {wordgen.count != null && (
            <div className="mt-4 rounded-lg bg-surface-2 p-3">
              <div className="text-sm font-semibold text-text">{wordgen.count.toLocaleString()} passwords generated</div>
              <div className="mt-1 max-h-24 overflow-y-auto text-xs text-text-muted">
                {wordgen.preview.join('  ·  ')}
                {wordgen.count > 30 ? '  …' : ''}
              </div>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => wordgen.downloadFull(seedsFromText(seedText), options)}>
                  Download .txt
                </Button>
                <Button variant="outline" size="sm" onClick={copyAll}>
                  Copy All
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
