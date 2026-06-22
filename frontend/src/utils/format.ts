export function fmtNum(n: number): string {
  return n.toLocaleString();
}

export function sanitizeFilename(s: string | null | undefined): string {
  return String(s ?? 'network').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
}
