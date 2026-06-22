import { useMemo } from 'react';
import type { ClientEntry, NetworkEntry } from '../../../api/types';
import { ENC_COLOR, deviceTypeColor, isAlertDeviceType } from '../../../utils/colors';
import { deviceIcon } from '../../../utils/deviceIcons';

interface MapPanelProps {
  networks: NetworkEntry[];
}

const AP_NODE_W = 195;
const AP_NODE_H = 62;
const AP_GAP = 10;
const CLI_NODE_W = 175;
const CLI_NODE_H = 54;
const CLI_GAP = 8;
const AP_X = 16;
const PAD_TOP = 36;
const SVG_W = 800;
const CLI_X = SVG_W - CLI_NODE_W - 16;

const DT_LEGEND: [string, string][] = [
  ['DVR/NVR/Camera', '#dc2626'],
  ['iPhone/iPad', '#6366f1'],
  ['Android', '#16a34a'],
  ['Computer', '#7c3aed'],
  ['Router/AP', '#0284c7'],
  ['IoT/Smart', '#d97706'],
  ['Unknown', '#94a3b8'],
];

export function MapPanel({ networks }: MapPanelProps) {
  const { allClients, apCY, cliCY, svgH } = useMemo(() => {
    const clientMap = new Map<string, ClientEntry>();
    networks.forEach((ap) => {
      (ap.clients || []).forEach((c) => {
        if (!clientMap.has(c.mac)) clientMap.set(c.mac, c);
      });
    });
    const allClients = Array.from(clientMap.values());

    const apTotalH = networks.length * (AP_NODE_H + AP_GAP);
    const cliTotalH = allClients.length * (CLI_NODE_H + CLI_GAP);
    const svgH = Math.max(apTotalH, cliTotalH, 120) + PAD_TOP + 16;

    const apCY = new Map<string, number>();
    networks.forEach((ap, i) => apCY.set(ap.bssid, PAD_TOP + i * (AP_NODE_H + AP_GAP) + AP_NODE_H / 2));

    const cliCY = new Map<string, number>();
    allClients.forEach((client, i) => cliCY.set(client.mac, PAD_TOP + i * (CLI_NODE_H + CLI_GAP) + CLI_NODE_H / 2));

    return { allClients, apCY, cliCY, svgH };
  }, [networks]);

  if (!networks.length) {
    return <div className="py-12 text-center text-text-muted">No network data to display.</div>;
  }

  const xA = AP_X + AP_NODE_W;
  const xC = CLI_X;
  const cpW = (xC - xA) * 0.42;

  return (
    <div className="py-3">
      <div className="mb-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
        <strong className="uppercase tracking-wide">Encryption:</strong>
        {Object.entries(ENC_COLOR).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm" style={{ background: v }} />
            {k}
          </span>
        ))}
        <strong className="uppercase tracking-wide">Device:</strong>
        {DT_LEGEND.map(([k, v]) => (
          <span key={k} className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm" style={{ background: v }} />
            {k}
          </span>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl bg-white p-2">
        <svg viewBox={`0 0 ${SVG_W} ${svgH}`} width={SVG_W} style={{ display: 'block', minHeight: Math.max(svgH, 140) }}>
          {networks.map((ap) => {
            const ay = apCY.get(ap.bssid)!;
            const col = ENC_COLOR[ap.encryption] || '#94a3b8';
            return (ap.clients || []).map((c) => {
              const cy = cliCY.get(c.mac);
              if (cy === undefined) return null;
              return (
                <path
                  key={`${ap.bssid}-${c.mac}`}
                  d={`M${xA},${ay} C${xA + cpW},${ay} ${xC - cpW},${cy} ${xC},${cy}`}
                  fill="none"
                  stroke={col}
                  strokeWidth={1.6}
                  opacity={0.3}
                />
              );
            });
          })}

          {networks.map((ap, i) => {
            const y = PAD_TOP + i * (AP_NODE_H + AP_GAP);
            const col = ENC_COLOR[ap.encryption] || '#94a3b8';
            const cc = (ap.clients || []).length;
            const label = ap.ssid.length > 21 ? ap.ssid.slice(0, 20) + '…' : ap.ssid;
            const chTxt = ap.channel ? ` · CH ${ap.channel}` : '';
            const sigTxt = ap.signal_dbm ? ` · ${ap.signal_dbm} dBm` : '';
            return (
              <g key={ap.bssid}>
                <rect x={AP_X} y={y} width={AP_NODE_W} height={AP_NODE_H} rx={10} fill="white" stroke={`${col}40`} strokeWidth={1.5} />
                <rect x={AP_X} y={y + 6} width={4} height={AP_NODE_H - 12} rx={2} fill={col} />
                <circle cx={AP_X + 30} cy={y + AP_NODE_H / 2} r={16} fill={`${col}18`} />
                <path
                  d={`M${AP_X + 22} ${y + AP_NODE_H / 2 - 4}c1.6-2 3.8-3.2 8-3.2s6.4 1.2 8 3.2`}
                  stroke={col}
                  strokeWidth={2}
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d={`M${AP_X + 25} ${y + AP_NODE_H / 2 + 1}c1-1.3 2.6-2 5-2s4 .7 5 2`}
                  stroke={col}
                  strokeWidth={2}
                  strokeLinecap="round"
                  fill="none"
                />
                <circle cx={AP_X + 30} cy={y + AP_NODE_H / 2 + 6} r={2} fill={col} />
                <text x={AP_X + 52} y={y + AP_NODE_H / 2 - 9} fontSize={12} fontWeight={700} fill="#0f172a">
                  {label}
                </text>
                <text x={AP_X + 52} y={y + AP_NODE_H / 2 + 5} fontSize={8.5} fill="#94a3b8" fontFamily="monospace">
                  {ap.bssid}
                </text>
                <text x={AP_X + 52} y={y + AP_NODE_H / 2 + 18} fontSize={9} fontWeight={600} fill={col}>
                  {ap.encryption}
                  {chTxt}
                  {sigTxt} · {cc} client{cc !== 1 ? 's' : ''}
                </text>
                <circle cx={AP_X + AP_NODE_W} cy={y + AP_NODE_H / 2} r={3.5} fill={col} />
              </g>
            );
          })}

          {allClients.map((client, i) => {
            const y = PAD_TOP + i * (CLI_NODE_H + CLI_GAP);
            const col = deviceTypeColor(client.device_type);
            const icon = deviceIcon(client.device_type);
            const vend = (client.vendor || 'Unknown').slice(0, 16);
            const sMac = `…${client.mac.slice(-8)}`;
            const dtype = (client.device_type || 'Unknown Device').slice(0, 18);
            const alert = isAlertDeviceType(client.device_type);
            const borderCol = alert ? '#dc2626' : `${col}60`;
            return (
              <g key={client.mac}>
                <rect
                  x={CLI_X}
                  y={y}
                  width={CLI_NODE_W}
                  height={CLI_NODE_H}
                  rx={10}
                  fill="white"
                  stroke={borderCol}
                  strokeWidth={alert ? 2 : 1.5}
                />
                <circle cx={CLI_X + 26} cy={y + CLI_NODE_H / 2} r={15} fill={`${col}18`} />
                <text x={CLI_X + 26} y={y + CLI_NODE_H / 2 + 5} textAnchor="middle" fontSize={14}>
                  {icon}
                </text>
                <text x={CLI_X + 48} y={y + CLI_NODE_H / 2 - 7} fontSize={11.5} fontWeight={700} fill="#0f172a">
                  {vend}
                </text>
                <text x={CLI_X + 48} y={y + CLI_NODE_H / 2 + 5} fontSize={8.5} fill="#94a3b8" fontFamily="monospace">
                  {sMac}
                </text>
                <text x={CLI_X + 48} y={y + CLI_NODE_H / 2 + 17} fontSize={9} fontWeight={600} fill={col}>
                  {dtype}
                </text>
                <circle cx={CLI_X} cy={y + CLI_NODE_H / 2} r={3.5} fill={col} />
              </g>
            );
          })}

          <text x={AP_X + AP_NODE_W / 2} y={22} textAnchor="middle" fontSize={9} fontWeight={700} letterSpacing=".09em" fill="#94a3b8">
            ACCESS POINTS
          </text>
          {allClients.length > 0 && (
            <text
              x={CLI_X + CLI_NODE_W / 2}
              y={22}
              textAnchor="middle"
              fontSize={9}
              fontWeight={700}
              letterSpacing=".09em"
              fill="#94a3b8"
            >
              CLIENTS
            </text>
          )}
        </svg>
      </div>
    </div>
  );
}
