export function deviceIcon(dtype: string | null | undefined): string {
  const t = (dtype || '').toLowerCase();
  if (t.includes('dvr') || t.includes('camera')) return '📹';
  if (t.includes('iphone') || t.includes('ipad')) return '🍎';
  if (t.includes('android')) return '🤖';
  if (t.includes('computer')) return '💻';
  if (t.includes('router') || t.includes('ap')) return '📡';
  if (t.includes('smart home') || t.includes('nest')) return '🏠';
  if (t.includes('speaker')) return '🔊';
  if (t.includes('streaming') || t.includes('tv')) return '📺';
  if (t.includes('gaming') || t.includes('playstation') || t.includes('nintendo')) return '🎮';
  if (t.includes('iot')) return '🔌';
  if (t.includes('light')) return '💡';
  return '📱';
}
