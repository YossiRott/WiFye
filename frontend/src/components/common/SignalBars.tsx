interface SignalBarsProps {
  dbm: number;
}

const HEIGHTS = [6, 9, 12, 16];

function tierFor(dbm: number): { bars: number; color: string } {
  if (dbm >= -55) return { bars: 4, color: 'bg-emerald-500' };
  if (dbm >= -65) return { bars: 3, color: 'bg-emerald-500' };
  if (dbm >= -75) return { bars: 2, color: 'bg-amber-500' };
  return { bars: 1, color: 'bg-red-500' };
}

export function SignalBars({ dbm }: SignalBarsProps) {
  const { bars, color } = tierFor(dbm);

  return (
    <div className="flex items-end gap-0.5" title={`${dbm} dBm`}>
      {HEIGHTS.map((h, i) => (
        <span
          key={i}
          className={`w-1 rounded-sm ${i < bars ? color : 'bg-zinc-700'}`}
          style={{ height: h }}
        />
      ))}
    </div>
  );
}
