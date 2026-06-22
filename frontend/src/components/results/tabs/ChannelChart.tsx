interface ChannelChartProps {
  channelUsage: Record<string, number>;
}

const BAR_W = 32;
const GAP = 10;
const PAD_L = 30;
const PAD_R = 20;
const PAD_T = 24;
const PAD_B = 36;
const CHART_H = 130;
const GRID_FRACTIONS = [0.25, 0.5, 0.75, 1];

export function ChannelChart({ channelUsage }: ChannelChartProps) {
  const entries = Object.entries(channelUsage)
    .map(([ch, cnt]) => ({ ch: Number(ch), cnt }))
    .sort((a, b) => a.ch - b.ch);

  if (!entries.length) return null;

  const maxCnt = Math.max(...entries.map((e) => e.cnt), 1);
  const svgW = PAD_L + entries.length * (BAR_W + GAP) - GAP + PAD_R;
  const svgH = PAD_T + CHART_H + PAD_B;

  return (
    <div className="rounded-xl bg-white p-4">
      <div className="mb-2 text-sm font-semibold text-slate-700">Channel Usage</div>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', height: 'auto', maxHeight: 220 }}>
        {GRID_FRACTIONS.map((f) => {
          const y = PAD_T + CHART_H - f * CHART_H;
          const val = Math.round(f * maxCnt);
          return (
            <g key={f}>
              <line x1={PAD_L} y1={y} x2={svgW - PAD_R} y2={y} stroke="#e2e8f0" strokeWidth={1} />
              <text x={PAD_L - 5} y={y + 4} textAnchor="end" fontSize={10} fill="#94a3b8">
                {val}
              </text>
            </g>
          );
        })}
        <line
          x1={PAD_L}
          y1={PAD_T + CHART_H}
          x2={svgW - PAD_R}
          y2={PAD_T + CHART_H}
          stroke="#cbd5e1"
          strokeWidth={1.5}
        />
        {entries.map(({ ch, cnt }, i) => {
          const bh = Math.round((cnt / maxCnt) * CHART_H);
          const bx = PAD_L + i * (BAR_W + GAP);
          const by = PAD_T + CHART_H - bh;
          const is5g = ch >= 36;
          const color = is5g ? '#7c3aed' : '#0ea5e9';
          const light = is5g ? '#ede9fe' : '#e0f2fe';
          return (
            <g key={ch}>
              <rect x={bx} y={PAD_T} width={BAR_W} height={CHART_H} rx={4} fill={light} />
              <rect x={bx} y={by} width={BAR_W} height={bh} rx={4} fill={color} opacity={0.9} />
              <text x={bx + BAR_W / 2} y={by - 5} textAnchor="middle" fontSize={11} fontWeight={700} fill="#475569">
                {cnt}
              </text>
              <text x={bx + BAR_W / 2} y={svgH - 8} textAnchor="middle" fontSize={11} fill="#64748b">
                {ch}
              </text>
            </g>
          );
        })}
        <rect x={svgW - 130} y={6} width={10} height={10} rx={2} fill="#0ea5e9" />
        <text x={svgW - 116} y={15} fontSize={10} fill="#64748b">
          2.4 GHz
        </text>
        <rect x={svgW - 70} y={6} width={10} height={10} rx={2} fill="#7c3aed" />
        <text x={svgW - 56} y={15} fontSize={10} fill="#64748b">
          5 GHz
        </text>
      </svg>
    </div>
  );
}
