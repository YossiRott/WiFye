export const ENC_COLOR: Record<string, string> = {
  WPA3: '#16a34a',
  WPA2: '#0ea5e9',
  WPA: '#ca8a04',
  WEP: '#dc2626',
  Open: '#94a3b8',
};

export function encBadgeClasses(enc: string | null | undefined): string {
  switch ((enc || '').toUpperCase()) {
    case 'WPA2':
      return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
    case 'WPA3':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    case 'WPA':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    case 'WEP':
      return 'bg-red-500/15 text-red-400 border-red-500/30';
    default:
      return 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30';
  }
}

export function deviceTypeColor(dtype: string | null | undefined): string {
  const t = (dtype || '').toLowerCase();
  if (t.includes('dvr') || t.includes('camera') || t.includes('nvr')) return '#dc2626';
  if (t.includes('iphone') || t.includes('ipad')) return '#6366f1';
  if (t.includes('android')) return '#16a34a';
  if (t.includes('computer')) return '#7c3aed';
  if (t.includes('router') || t.includes('ap')) return '#0284c7';
  if (t.includes('smart') || t.includes('iot') || t.includes('speaker') || t.includes('nest')) return '#d97706';
  if (t.includes('streaming') || t.includes('tv')) return '#0891b2';
  if (t.includes('gaming')) return '#7c3aed';
  return '#94a3b8';
}

export function isAlertDeviceType(dtype: string | null | undefined): boolean {
  return /dvr|camera|nvr/i.test(dtype || '');
}
