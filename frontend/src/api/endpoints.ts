import type {
  AnalyzeResponse,
  CrackStartRequest,
  CrackStartResponse,
  CrackStatusResponse,
  UploadDictResponse,
  WordgenRequest,
  WordgenResponse,
  WordgenPathResponse,
  WordlistEntry,
} from './types';

async function asJson<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok && !data.error) {
    throw new Error('Server error');
  }
  return data as T;
}

export function analyzeFile(file: File): Promise<AnalyzeResponse> {
  const form = new FormData();
  form.append('file', file);
  return fetch('/api/analyze', { method: 'POST', body: form }).then(asJson<AnalyzeResponse>);
}

export function getCrackWordlists(): Promise<WordlistEntry[]> {
  return fetch('/api/crack/wordlists').then(asJson<WordlistEntry[]>);
}

export function uploadDict(file: File): Promise<UploadDictResponse> {
  const form = new FormData();
  form.append('file', file);
  return fetch('/api/crack/upload-dict', { method: 'POST', body: form }).then(asJson<UploadDictResponse>);
}

export function startCrack(req: CrackStartRequest): Promise<CrackStartResponse> {
  return fetch('/api/crack/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  }).then(asJson<CrackStartResponse>);
}

export function getCrackStatus(fromLine: number): Promise<CrackStatusResponse> {
  return fetch(`/api/crack/status?from=${fromLine}`).then(asJson<CrackStatusResponse>);
}

export function stopCrack(): Promise<{ stopped: boolean }> {
  return fetch('/api/crack/stop', { method: 'POST' }).then(asJson<{ stopped: boolean }>);
}

export function clearCrack(): Promise<{ cleared: boolean }> {
  return fetch('/api/crack/clear', { method: 'POST' }).then(asJson<{ cleared: boolean }>);
}

export function generateWordlist(req: WordgenRequest): Promise<WordgenResponse> {
  return fetch('/api/wordgen', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  }).then(asJson<WordgenResponse>);
}

export function getWordgenPath(): Promise<WordgenPathResponse> {
  return fetch('/api/wordgen/path').then(asJson<WordgenPathResponse>);
}
