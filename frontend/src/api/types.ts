export interface ClientEntry {
  mac: string;
  vendor: string;
  device_type: string;
  signal_dbm: number | null;
}

export interface NetworkEntry {
  ssid: string;
  bssid: string;
  channel: number;
  encryption: string;
  signal_dbm: number | null;
  first_seen: string | null;
  last_seen: string | null;
  clients: ClientEntry[];
  is_evil_twin: boolean;
}

export interface ProbeEntry {
  client_mac: string;
  vendor: string;
  device_type: string;
  probed_ssids: string[];
}

export interface DeauthFlood {
  src_mac: string;
  vendor: string;
  count: number;
}

export interface EvilTwin {
  ssid: string;
  bssids: string[];
}

export interface HashEntry {
  ssid: string;
  bssid: string;
  client_mac: string;
  hash_22000: string;
  has_full_handshake: boolean;
  hash_type: 'EAPOL' | 'PMKID';
}

export interface AnalysisSummary {
  total_aps: number;
  total_clients: number;
  total_packets: number;
  total_handshakes?: number;
  scan_duration: string;
}

export interface AnalyzeResponse {
  summary: AnalysisSummary;
  networks: NetworkEntry[];
  probes: ProbeEntry[];
  deauth_floods: DeauthFlood[];
  evil_twins: EvilTwin[];
  channel_usage: Record<string, number>;
  hashes: HashEntry[];
  error?: string;
}

export interface WordlistEntry {
  path: string;
  name: string;
  size: string;
  is_default: boolean;
}

export interface UploadDictResponse {
  path: string;
  name: string;
  size: number;
  error?: string;
}

export type Workload = '1' | '2' | '3' | '4';

export interface CrackStartRequest {
  hashes: string[];
  wordlists: string[];
  workload: Workload;
}

export interface CrackStartResponse {
  started?: boolean;
  cmd?: string;
  error?: string;
}

export interface CrackedPassword {
  ssid: string;
  password: string;
}

export interface CrackStats {
  speed?: string;
  progress?: number;
  tried?: number;
  total_ksp?: number;
  recovered?: number;
  status_text?: string;
  elapsed?: string;
}

export interface CrackStatusResponse {
  status: 'idle' | 'running' | 'done' | 'stopped';
  output: string[];
  total: number;
  done: boolean;
  cracked: CrackedPassword[];
  stats: CrackStats;
}

export interface WordgenOptions {
  capitals: boolean;
  leet: boolean;
  numbers: boolean;
  special: boolean;
  combos: boolean;
  prefixes: boolean;
}

export interface WordgenRequest {
  seeds: string[];
  options: WordgenOptions;
  full?: boolean;
}

export interface WordgenResponse {
  count: number;
  preview: string[];
  path: string;
  words?: string[];
  error?: string;
}

export interface WordgenPathResponse {
  path: string | null;
  exists: boolean;
}
