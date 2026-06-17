/* ── State ───────────────────────────────────────────────────── */
let analysisData   = null;
let currentTab     = 'networks';
let sortKey        = 'clients';
let filterText     = '';
let mapBuilt       = false;

// Crack state
let crackRunning      = false;
let crackOutputLine   = 0;
let crackPollTimer    = null;
let selectedDicts     = [];   // {path, name, source}
let uploadedDictPath  = null;
let wordgenPath       = null;
let wordgenWords      = [];   // full word list from last generation

/* ── DOM refs ────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);

const uploadSection  = $('uploadSection');
const loadingSection = $('loadingSection');
const errorSection   = $('errorSection');
const resultsSection = $('resultsSection');
const uploadArea     = $('uploadArea');
const fileInput      = $('fileInput');

/* ── Upload interactions ─────────────────────────────────────── */
uploadArea.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', e => {
  if (e.target.files[0]) startAnalysis(e.target.files[0]);
});

uploadArea.addEventListener('dragover', e => {
  e.preventDefault();
  uploadArea.classList.add('drag-over');
});
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
uploadArea.addEventListener('drop', e => {
  e.preventDefault();
  uploadArea.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) startAnalysis(file);
});

/* ── Analysis flow ───────────────────────────────────────────── */
function startAnalysis(file) {
  show('loading');
  $('loadingFile').textContent = file.name;

  const steps = [$('step1'), $('step2'), $('step3'), $('step4')];
  steps.forEach(s => { s.className = 'step'; });
  steps[0].classList.add('active');
  let stepIdx = 0;
  const stepTimer = setInterval(() => {
    steps[stepIdx].classList.remove('active');
    steps[stepIdx].classList.add('done');
    stepIdx++;
    if (stepIdx < steps.length) {
      steps[stepIdx].classList.add('active');
    } else {
      clearInterval(stepTimer);
    }
  }, 650);

  const form = new FormData();
  form.append('file', file);

  fetch('/api/analyze', { method: 'POST', body: form })
    .then(res => {
      if (!res.ok) return res.json().then(d => Promise.reject(d.error || 'Server error'));
      return res.json();
    })
    .then(data => {
      clearInterval(stepTimer);
      if (data.error) { showError(data.error); return; }
      analysisData = data;
      renderResults(data);
      show('results');
    })
    .catch(err => {
      clearInterval(stepTimer);
      showError(typeof err === 'string' ? err : 'Unexpected error. Check the server is running.');
    });
}

function show(which) {
  uploadSection.classList.toggle('hidden',  which !== 'upload');
  loadingSection.classList.toggle('hidden', which !== 'loading');
  errorSection.classList.toggle('hidden',   which !== 'error');
  resultsSection.classList.toggle('hidden', which !== 'results');
}

function showError(msg) {
  $('errorMsg').textContent = msg;
  show('error');
}

function resetApp() {
  analysisData = null;
  fileInput.value = '';
  sortKey = 'clients';
  filterText = '';
  mapBuilt = false;
  $('networkSearch').value = '';
  document.querySelectorAll('.sort-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.sort === 'clients'));
  $('networksList').innerHTML = '';
  $('hashTable').innerHTML = '';
  $('probesContent').innerHTML = '';
  $('insightAlerts').innerHTML = '';
  $('channelChartWrap').innerHTML = '';
  $('networkMap').innerHTML = '';
  $('alertBanners').innerHTML = '';
  // Reset crack state
  clearInterval(crackPollTimer);
  crackRunning = false;
  crackOutputLine = 0;
  selectedDicts = [];
  $('crackPanel').classList.add('hidden');
  $('crackConsole').classList.add('hidden');
  $('crackConfig').classList.remove('hidden');
  if ($('crackedResults')) { $('crackedResults').classList.add('hidden'); $('crackedResults').innerHTML = ''; }
  if ($('crackNoMatch'))  $('crackNoMatch').classList.add('hidden');
  fetch('/api/crack/clear', { method: 'POST' }).catch(() => {});
  currentTab = 'networks';
  show('upload');
}

/* ── Results renderer ────────────────────────────────────────── */
function renderResults(data) {
  const s = data.summary || {};
  $('statAPs').textContent        = s.total_aps        ?? 0;
  $('statClients').textContent    = s.total_clients    ?? 0;
  $('statHandshakes').textContent = s.total_handshakes ?? 0;
  $('statPackets').textContent    = fmtNum(s.total_packets ?? 0);
  $('statDuration').textContent   = s.scan_duration || '—';

  mapBuilt = false;

  const nets    = data.networks      || [];
  const hashes  = data.hashes        || [];
  const probes  = data.probes        || [];
  const floods  = data.deauth_floods || [];
  const twins   = data.evil_twins    || [];

  $('tabNetworksBadge').textContent = nets.length;
  $('tabHashesBadge').textContent   = hashes.length;
  $('tabProbesBadge').textContent   = probes.length;

  const alertCount = floods.length + twins.length;
  $('tabInsightsBadge').textContent = alertCount || '0';

  renderAlertBanners(twins, floods);
  renderNetworks(nets);
  renderHashes(hashes);
  renderProbes(probes);
  renderInsights(data);

  switchTab('networks');
}

/* ── Tab switching ───────────────────────────────────────────── */
function switchTab(which) {
  currentTab = which;
  const tabs = ['networks', 'hashes', 'probes', 'insights', 'map'];
  tabs.forEach(t => {
    const btn   = $('tab' + t.charAt(0).toUpperCase() + t.slice(1));
    const panel = $('panel' + t.charAt(0).toUpperCase() + t.slice(1));
    if (btn)   btn.classList.toggle('active', t === which);
    if (panel) panel.classList.toggle('hidden', t !== which);
  });
  if (which === 'map' && !mapBuilt && analysisData) {
    renderMap(analysisData);
    mapBuilt = true;
  }
}

/* ── Alert banners ───────────────────────────────────────────── */
function renderAlertBanners(twins, floods) {
  const el = $('alertBanners');
  let html = '';

  twins.forEach(et => {
    html += `<div class="alert-banner alert-yellow">
      <svg viewBox="0 0 20 20" fill="none"><path d="M10 3L2 17h16L10 3z" stroke="#ca8a04" stroke-width="1.8" stroke-linejoin="round"/><path d="M10 9v4M10 14.5v.5" stroke="#ca8a04" stroke-width="1.8" stroke-linecap="round"/></svg>
      <span><strong>Evil Twin:</strong> "${escHtml(et.ssid)}" broadcast by ${et.bssids.length} different BSSIDs</span>
    </div>`;
  });

  floods.forEach(df => {
    html += `<div class="alert-banner alert-red">
      <svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="#dc2626" stroke-width="1.8"/><path d="M10 6v5M10 13.5v.5" stroke="#dc2626" stroke-width="1.8" stroke-linecap="round"/></svg>
      <span><strong>Deauth Flood:</strong> ${escHtml(df.src_mac)} (${escHtml(df.vendor)}) — ${df.count} frames</span>
    </div>`;
  });

  el.innerHTML = html;
}

/* ── Sort & filter ───────────────────────────────────────────── */
function sortNetworks(key) {
  sortKey = key;
  document.querySelectorAll('.sort-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.sort === key));
  applyFiltersAndSort();
}

function filterNetworks() {
  filterText = $('networkSearch').value.toLowerCase();
  applyFiltersAndSort();
}

function applyFiltersAndSort() {
  const nets = analysisData?.networks || [];
  const ENC_ORDER = { WPA3: 0, WPA2: 1, WPA: 2, WEP: 3, Open: 4, Unknown: 5 };

  let filtered = nets.filter(ap =>
    !filterText ||
    ap.ssid.toLowerCase().includes(filterText) ||
    ap.bssid.toLowerCase().includes(filterText)
  );

  filtered = [...filtered].sort((a, b) => {
    switch (sortKey) {
      case 'clients': return (b.clients?.length ?? 0) - (a.clients?.length ?? 0);
      case 'signal':  return (b.signal_dbm ?? -200) - (a.signal_dbm ?? -200);
      case 'name':    return a.ssid.localeCompare(b.ssid);
      case 'enc':     return (ENC_ORDER[a.encryption] ?? 5) - (ENC_ORDER[b.encryption] ?? 5);
      default:        return 0;
    }
  });

  const list  = $('networksList');
  const empty = $('noNetworks');
  list.innerHTML = filtered.map((ap, i) => apCardHtml(ap, i)).join('');
  list.querySelectorAll('.ap-header').forEach(h =>
    h.addEventListener('click', () => h.closest('.ap-card').classList.toggle('open')));
  empty.classList.toggle('hidden', filtered.length > 0);
}

/* ── Networks renderer ───────────────────────────────────────── */
function renderNetworks(networks) {
  applyFiltersAndSort();
}

function apCardHtml(ap, idx) {
  const encClass = encBadgeClass(ap.encryption);
  const clients  = ap.clients || [];
  const sigHtml  = ap.signal_dbm ? signalHtml(ap.signal_dbm) : '';
  const hasDvr   = clients.some(c => c.device_type === 'DVR/Camera');
  const isEvil   = ap.is_evil_twin;

  const timelineHtml = (ap.first_seen || ap.last_seen)
    ? `<div class="ap-timeline">
        ${ap.first_seen ? `<span class="timeline-item">▷ ${ap.first_seen}</span>` : ''}
        ${ap.last_seen  ? `<span class="timeline-item">◁ ${ap.last_seen}</span>`  : ''}
       </div>`
    : '';

  const clientsHtml = clients.length
    ? `<div class="clients-grid">${clients.map(clientHtml).join('')}</div>`
    : `<div class="no-clients-msg">No clients observed for this network</div>`;

  return `
  <div class="ap-card" id="apCard${idx}">
    <div class="ap-header">
      <div class="ap-wifi-icon">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M5 12.5C7 10 9.3 8.5 12 8.5c2.7 0 5 1.5 7 4" stroke="#0ea5e9" stroke-width="2" stroke-linecap="round"/>
          <path d="M8 15.5c1.1-1.2 2.4-2 4-2s2.9.8 4 2" stroke="#0ea5e9" stroke-width="2" stroke-linecap="round"/>
          <circle cx="12" cy="18.5" r="1.5" fill="#0ea5e9"/>
        </svg>
      </div>
      <div class="ap-info">
        <div class="ap-ssid">${escHtml(ap.ssid)}</div>
        <div class="ap-meta">
          <span class="ap-bssid">${ap.bssid}</span>
          <span class="badge ${encClass}">${ap.encryption}</span>
          ${ap.channel ? `<span class="badge badge-ch">CH ${ap.channel}</span>` : ''}
          ${hasDvr  ? `<span class="badge badge-dvr">DVR detected</span>` : ''}
          ${isEvil  ? `<span class="badge badge-wep">Evil Twin</span>` : ''}
        </div>
        ${timelineHtml}
      </div>
      <div class="ap-right">
        ${sigHtml}
        <span class="ap-client-count">${clients.length} client${clients.length !== 1 ? 's' : ''}</span>
        <span class="ap-chevron">
          <svg viewBox="0 0 20 20" fill="none"><path d="M5 8l5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </span>
      </div>
    </div>
    <div class="ap-clients">${clientsHtml}</div>
  </div>`;
}

function clientHtml(c) {
  const icon  = deviceIcon(c.device_type);
  const isDvr = c.device_type === 'DVR/Camera';
  return `
  <div class="client-item">
    <div class="client-device-icon" title="${escHtml(c.device_type)}">${icon}</div>
    <div class="client-info">
      <div class="client-mac">${c.mac}</div>
      <div class="client-vendor">${escHtml(c.vendor)}</div>
      <div class="client-dtype${isDvr ? ' badge-dvr' : ''}">${escHtml(c.device_type)}</div>
    </div>
  </div>`;
}

/* ── Hashes renderer ─────────────────────────────────────────── */
function renderHashes(hashes) {
  const empty = $('noHashes');
  const list  = $('hashesList');
  const table = $('hashTable');

  if (!hashes.length) {
    empty.classList.remove('hidden');
    list.classList.add('hidden');
    $('crackPanel').classList.add('hidden');
    return;
  }
  empty.classList.add('hidden');
  list.classList.remove('hidden');
  table.innerHTML = hashes.map((h, i) => hashRowHtml(h, i)).join('');

  // Auto-open crack panel whenever there are hashes
  $('crackPanel').classList.remove('hidden');
  loadSystemWordlists();
  checkWordgenAvailable();
}

function hashRowHtml(h, idx) {
  const statusCls = h.has_full_handshake ? 'badge-full' : 'badge-partial';
  const statusTxt = h.has_full_handshake ? 'Full' : 'Partial';
  const typeCls   = h.hash_type === 'PMKID' ? 'badge-pmkid' : 'badge-eapol';
  const typeTxt   = h.hash_type || 'EAPOL';

  return `
  <div class="hash-row">
    <div class="hash-top">
      <span class="hash-ssid">${escHtml(h.ssid)}</span>
      <div class="hash-macs">
        <div class="mac-chip"><span class="mac-chip-label">AP</span><span class="mac-chip-val">${h.bssid}</span></div>
        <div class="mac-chip"><span class="mac-chip-label">Client</span><span class="mac-chip-val">${h.client_mac}</span></div>
      </div>
      <span class="badge ${typeCls}">${typeTxt}</span>
      <span class="badge ${statusCls}">${statusTxt}</span>
    </div>
    <div class="hash-body">
      <div class="hash-value" id="hashVal${idx}">${escHtml(h.hash_22000)}</div>
      <div class="hash-actions">
        <button class="btn btn-icon btn-sm" id="copyBtn${idx}" onclick="copyHash(${idx})" title="Copy hash">
          <svg viewBox="0 0 16 16" fill="none"><rect x="5" y="3" width="8" height="10" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M3 5H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          Copy
        </button>
        <button class="btn btn-icon btn-sm" onclick="downloadHash(${idx})" title="Download .22000">
          <svg viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 13h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          .22000
        </button>
      </div>
    </div>
  </div>`;
}

/* ── Hash actions ────────────────────────────────────────────── */
function copyHash(idx) {
  const hash = analysisData.hashes[idx].hash_22000;
  navigator.clipboard.writeText(hash).then(() => {
    const btn = $(`copyBtn${idx}`);
    btn.classList.add('copied');
    btn.innerHTML = `<svg viewBox="0 0 16 16" fill="none"><path d="M2 8l4 4 8-8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> Copied!`;
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = `<svg viewBox="0 0 16 16" fill="none"><rect x="5" y="3" width="8" height="10" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M3 5H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> Copy`;
    }, 2000);
  });
}

function downloadHash(idx) {
  const h = analysisData.hashes[idx];
  downloadText(h.hash_22000 + '\n', `${sanitizeFilename(h.ssid)}_${h.bssid.replace(/:/g, '')}.22000`);
}

function downloadAll() {
  if (!analysisData?.hashes?.length) return;
  downloadText(analysisData.hashes.map(h => h.hash_22000).join('\n') + '\n', 'wifye_hashes.22000');
}

/* ── Probes renderer ─────────────────────────────────────────── */
function renderProbes(probes) {
  const content = $('probesContent');
  const empty   = $('noProbes');

  if (!probes.length) {
    content.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  content.innerHTML = `
    <table class="data-table">
      <thead><tr>
        <th>Client MAC</th>
        <th>Vendor</th>
        <th>Device Type</th>
        <th>Probed SSIDs (${probes.reduce((s, p) => s + p.probed_ssids.length, 0)} total)</th>
      </tr></thead>
      <tbody>
        ${probes.map(p => `
        <tr>
          <td class="mono">${escHtml(p.client_mac)}</td>
          <td>${escHtml(p.vendor)}</td>
          <td>${escHtml(p.device_type)}</td>
          <td class="ssid-pills">
            ${p.probed_ssids.map(s => `<span class="ssid-pill">${escHtml(s)}</span>`).join('')}
          </td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

/* ── Insights renderer ───────────────────────────────────────── */
function renderInsights(data) {
  const alertsEl = $('insightAlerts');
  const chartEl  = $('channelChartWrap');

  const twins  = data.evil_twins    || [];
  const floods = data.deauth_floods || [];

  let html = '';

  twins.forEach(et => {
    html += `<div class="insight-card insight-yellow">
      <div class="insight-card-title">⚠ Evil Twin — "${escHtml(et.ssid)}"</div>
      <div class="insight-card-body">
        Multiple access points are broadcasting this SSID with different BSSIDs.<br>
        ${et.bssids.map(b => `<span class="mono">${b}</span>`).join('  ·  ')}
      </div>
    </div>`;
  });

  floods.forEach(df => {
    html += `<div class="insight-card insight-red">
      <div class="insight-card-title">⚡ Deauth Flood — <span class="mono">${escHtml(df.src_mac)}</span></div>
      <div class="insight-card-body">
        ${escHtml(df.vendor)} sent <strong>${df.count}</strong> deauthentication frames.
        This may indicate a jamming or de-association attack in progress.
      </div>
    </div>`;
  });

  if (!html) {
    html = `<div class="insight-card insight-none">
      <div class="insight-card-title">✓ No Security Alerts</div>
      <div class="insight-card-body">No evil twins or deauth floods detected in this capture.</div>
    </div>`;
  }

  alertsEl.innerHTML = html;
  chartEl.innerHTML  = buildChannelChartHtml(data.channel_usage || {});
}

/* ── Channel chart (SVG) ─────────────────────────────────────── */
function buildChannelChartHtml(channelUsage) {
  const entries = Object.entries(channelUsage)
    .map(([ch, cnt]) => ({ ch: Number(ch), cnt }))
    .sort((a, b) => a.ch - b.ch);

  if (!entries.length) return '';

  const BAR_W = 32, GAP = 10, PAD_L = 30, PAD_R = 20, PAD_T = 24, PAD_B = 36;
  const CHART_H = 130;
  const maxCnt  = Math.max(...entries.map(e => e.cnt), 1);
  const svgW    = PAD_L + entries.length * (BAR_W + GAP) - GAP + PAD_R;
  const svgH    = PAD_T + CHART_H + PAD_B;

  // y gridlines
  const gridLines = [0.25, 0.5, 0.75, 1].map(f => {
    const y   = PAD_T + CHART_H - f * CHART_H;
    const val = Math.round(f * maxCnt);
    return `<line x1="${PAD_L}" y1="${y}" x2="${svgW - PAD_R}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>
            <text x="${PAD_L - 5}" y="${y + 4}" text-anchor="end" font-size="10" fill="#94a3b8">${val}</text>`;
  }).join('');

  const bars = entries.map(({ ch, cnt }, i) => {
    const bh    = Math.round((cnt / maxCnt) * CHART_H);
    const bx    = PAD_L + i * (BAR_W + GAP);
    const by    = PAD_T + CHART_H - bh;
    const is5g  = ch >= 36;
    const color = is5g ? '#7c3aed' : '#0ea5e9';
    const light = is5g ? '#ede9fe' : '#e0f2fe';
    return `
      <rect x="${bx}" y="${PAD_T}" width="${BAR_W}" height="${CHART_H}" rx="4" fill="${light}"/>
      <rect x="${bx}" y="${by}" width="${BAR_W}" height="${bh}" rx="4" fill="${color}" opacity="0.9"/>
      <text x="${bx + BAR_W / 2}" y="${by - 5}" text-anchor="middle" font-size="11" font-weight="700" fill="#475569">${cnt}</text>
      <text x="${bx + BAR_W / 2}" y="${svgH - 8}" text-anchor="middle" font-size="11" fill="#64748b">${ch}</text>`;
  }).join('');

  // baseline
  const baseline = `<line x1="${PAD_L}" y1="${PAD_T + CHART_H}" x2="${svgW - PAD_R}" y2="${PAD_T + CHART_H}" stroke="#cbd5e1" stroke-width="1.5"/>`;

  // legend
  const legend = `
    <rect x="${svgW - 130}" y="6" width="10" height="10" rx="2" fill="#0ea5e9"/>
    <text x="${svgW - 116}" y="15" font-size="10" fill="#64748b">2.4 GHz</text>
    <rect x="${svgW - 70}" y="6" width="10" height="10" rx="2" fill="#7c3aed"/>
    <text x="${svgW - 56}" y="15" font-size="10" fill="#64748b">5 GHz</text>`;

  return `
    <div class="chart-section">
      <div class="chart-section-title">Channel Usage</div>
      <svg viewBox="0 0 ${svgW} ${svgH}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;max-height:220px">
        ${gridLines}${baseline}${bars}${legend}
      </svg>
    </div>`;
}

/* ── Network map ─────────────────────────────────────────────── */
function renderMap(data) {
  const container = $('networkMap');
  const networks  = data.networks || [];

  if (!networks.length) {
    container.innerHTML = '<div class="map-empty">No network data to display.</div>';
    return;
  }

  const ENC_COLOR = {
    WPA3: '#16a34a', WPA2: '#0ea5e9', WPA: '#ca8a04', WEP: '#dc2626', Open: '#94a3b8'
  };

  const dtColor = dtype => {
    const t = (dtype || '').toLowerCase();
    if (t.includes('dvr') || t.includes('camera') || t.includes('nvr')) return '#dc2626';
    if (t.includes('iphone') || t.includes('ipad'))  return '#6366f1';
    if (t.includes('android'))   return '#16a34a';
    if (t.includes('computer'))  return '#7c3aed';
    if (t.includes('router') || t.includes('ap'))    return '#0284c7';
    if (t.includes('smart') || t.includes('iot') || t.includes('speaker') || t.includes('nest')) return '#d97706';
    if (t.includes('streaming') || t.includes('tv')) return '#0891b2';
    if (t.includes('gaming'))    return '#7c3aed';
    return '#94a3b8';
  };

  // Collect unique clients in AP order
  const clientMap = {};
  networks.forEach(ap => {
    (ap.clients || []).forEach(c => {
      if (!clientMap[c.mac]) clientMap[c.mac] = { client: c, apBssid: ap.bssid };
    });
  });
  const allClients = Object.values(clientMap);

  // Layout constants
  const AP_NODE_W = 195, AP_NODE_H = 62, AP_GAP = 10;
  const CLI_NODE_W = 175, CLI_NODE_H = 54, CLI_GAP = 8;
  const AP_X = 16, PAD_TOP = 36;
  const SVG_W = 800;
  const CLI_X = SVG_W - CLI_NODE_W - 16;

  const apTotalH  = networks.length    * (AP_NODE_H  + AP_GAP);
  const cliTotalH = allClients.length  * (CLI_NODE_H + CLI_GAP);
  const SVG_H = Math.max(apTotalH, cliTotalH, 120) + PAD_TOP + 16;

  // Vertical center Y of each node
  const apCY = {};
  networks.forEach((ap, i) => {
    apCY[ap.bssid] = PAD_TOP + i * (AP_NODE_H + AP_GAP) + AP_NODE_H / 2;
  });
  const cliCY = {};
  allClients.forEach(({ client }, i) => {
    cliCY[client.mac] = PAD_TOP + i * (CLI_NODE_H + CLI_GAP) + CLI_NODE_H / 2;
  });

  // ── Bezier edge curves ──────────────────────────────────────
  let edgesSVG = '';
  networks.forEach(ap => {
    const ay   = apCY[ap.bssid];
    const col  = ENC_COLOR[ap.encryption] || '#94a3b8';
    const xA   = AP_X + AP_NODE_W;
    const xC   = CLI_X;
    const cpW  = (xC - xA) * 0.42;
    (ap.clients || []).forEach(c => {
      const cy = cliCY[c.mac];
      if (cy === undefined) return;
      edgesSVG += `<path d="M${xA},${ay} C${xA + cpW},${ay} ${xC - cpW},${cy} ${xC},${cy}" fill="none" stroke="${col}" stroke-width="1.6" opacity="0.3"/>`;
    });
  });

  // ── AP nodes ────────────────────────────────────────────────
  let apNodesSVG = '';
  networks.forEach((ap, i) => {
    const y    = PAD_TOP + i * (AP_NODE_H + AP_GAP);
    const col  = ENC_COLOR[ap.encryption] || '#94a3b8';
    const cc   = (ap.clients || []).length;
    const label = ap.ssid.length > 21 ? ap.ssid.slice(0, 20) + '…' : ap.ssid;
    const chTxt = ap.channel ? ` · CH ${ap.channel}` : '';
    const sigTxt = ap.signal_dbm ? ` · ${ap.signal_dbm} dBm` : '';
    // Card bg + colored left stripe
    apNodesSVG += `
      <rect x="${AP_X}" y="${y}" width="${AP_NODE_W}" height="${AP_NODE_H}" rx="10" fill="white" stroke="${col}40" stroke-width="1.5" filter="url(#cardShadow)"/>
      <rect x="${AP_X}" y="${y + 6}" width="4" height="${AP_NODE_H - 12}" rx="2" fill="${col}"/>
      <circle cx="${AP_X + 30}" cy="${y + AP_NODE_H/2}" r="16" fill="${col}18"/>
      <path d="M${AP_X+22} ${y + AP_NODE_H/2 - 4}c1.6-2 3.8-3.2 8-3.2s6.4 1.2 8 3.2" stroke="${col}" stroke-width="2" stroke-linecap="round" fill="none"/>
      <path d="M${AP_X+25} ${y + AP_NODE_H/2 + 1}c1-1.3 2.6-2 5-2s4 .7 5 2" stroke="${col}" stroke-width="2" stroke-linecap="round" fill="none"/>
      <circle cx="${AP_X+30}" cy="${y + AP_NODE_H/2 + 6}" r="2" fill="${col}"/>
      <text x="${AP_X+52}" y="${y + AP_NODE_H/2 - 9}" font-size="12" font-weight="700" fill="#0f172a">${escHtml(label)}</text>
      <text x="${AP_X+52}" y="${y + AP_NODE_H/2 + 5}" font-size="8.5" fill="#94a3b8" font-family="monospace">${ap.bssid}</text>
      <text x="${AP_X+52}" y="${y + AP_NODE_H/2 + 18}" font-size="9" font-weight="600" fill="${col}">${ap.encryption}${chTxt}${sigTxt} · ${cc} client${cc !== 1 ? 's' : ''}</text>
      <circle cx="${AP_X + AP_NODE_W}" cy="${y + AP_NODE_H/2}" r="3.5" fill="${col}"/>`;
  });

  // ── Client nodes ────────────────────────────────────────────
  let cliNodesSVG = '';
  allClients.forEach(({ client }, i) => {
    const y     = PAD_TOP + i * (CLI_NODE_H + CLI_GAP);
    const col   = dtColor(client.device_type);
    const icon  = deviceIcon(client.device_type);
    const vend  = (client.vendor || 'Unknown').slice(0, 16);
    const sMAC  = '…' + client.mac.slice(-8);
    const dtype = (client.device_type || 'Unknown Device').slice(0, 18);
    const isAlert = /dvr|camera|nvr/i.test(client.device_type || '');
    const borderCol = isAlert ? '#dc2626' : col + '60';
    cliNodesSVG += `
      <rect x="${CLI_X}" y="${y}" width="${CLI_NODE_W}" height="${CLI_NODE_H}" rx="10" fill="white" stroke="${borderCol}" stroke-width="${isAlert ? '2' : '1.5'}" filter="url(#cardShadow)"/>
      <circle cx="${CLI_X + 26}" cy="${y + CLI_NODE_H/2}" r="15" fill="${col}18"/>
      <text x="${CLI_X + 26}" y="${y + CLI_NODE_H/2 + 5}" text-anchor="middle" font-size="14">${icon}</text>
      <text x="${CLI_X + 48}" y="${y + CLI_NODE_H/2 - 7}" font-size="11.5" font-weight="700" fill="#0f172a">${escHtml(vend)}</text>
      <text x="${CLI_X + 48}" y="${y + CLI_NODE_H/2 + 5}" font-size="8.5" fill="#94a3b8" font-family="monospace">${sMAC}</text>
      <text x="${CLI_X + 48}" y="${y + CLI_NODE_H/2 + 17}" font-size="9" font-weight="600" fill="${col}">${escHtml(dtype)}</text>
      <circle cx="${CLI_X}" cy="${y + CLI_NODE_H/2}" r="3.5" fill="${col}"/>`;
  });

  // ── Column labels ───────────────────────────────────────────
  const colLabels = `
    <text x="${AP_X + AP_NODE_W/2}" y="22" text-anchor="middle" font-size="9" font-weight="700" letter-spacing=".09em" fill="#94a3b8">ACCESS POINTS</text>
    ${allClients.length ? `<text x="${CLI_X + CLI_NODE_W/2}" y="22" text-anchor="middle" font-size="9" font-weight="700" letter-spacing=".09em" fill="#94a3b8">CLIENTS</text>` : ''}`;

  // ── Legend ──────────────────────────────────────────────────
  const encEntries = Object.entries(ENC_COLOR);
  const dtEntries  = [
    ['DVR/NVR/Camera','#dc2626'], ['iPhone/iPad','#6366f1'], ['Android','#16a34a'],
    ['Computer','#7c3aed'], ['Router/AP','#0284c7'], ['IoT/Smart','#d97706'], ['Unknown','#94a3b8'],
  ];
  const legendHtml = `
    <div class="legend-row">
      <strong style="font-size:.68rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em">Encryption:</strong>
      ${encEntries.map(([k,v]) => `<span class="legend-item"><span class="legend-dot" style="background:${v}"></span>${k}</span>`).join('')}
      &nbsp;
      <strong style="font-size:.68rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em">Device:</strong>
      ${dtEntries.map(([k,v]) => `<span class="legend-item"><span class="legend-dot" style="background:${v}"></span>${k}</span>`).join('')}
    </div>`;

  container.innerHTML = `
    <div class="map-wrap">
      <div class="map-legend">${legendHtml}</div>
      <div class="map-scroll">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_W} ${SVG_H}" width="${SVG_W}" style="display:block;min-height:${Math.max(SVG_H,140)}px">
          <defs>
            <filter id="cardShadow" x="-5%" y="-8%" width="110%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#0ea5e9" flood-opacity="0.07"/>
              <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#00000012"/>
            </filter>
          </defs>
          ${edgesSVG}
          ${apNodesSVG}
          ${cliNodesSVG}
          ${colLabels}
        </svg>
      </div>
    </div>`;
}

/* ── Export ──────────────────────────────────────────────────── */
function exportJSON() {
  if (!analysisData) return;
  downloadText(JSON.stringify(analysisData, null, 2), 'wifye_analysis.json');
}

function exportCSV() {
  if (!analysisData) return;
  const rows = [['SSID', 'BSSID', 'Channel', 'Encryption', 'Signal_dBm', 'Clients', 'First_Seen', 'Last_Seen', 'Evil_Twin']];
  (analysisData.networks || []).forEach(ap => {
    rows.push([
      ap.ssid, ap.bssid, ap.channel ?? '', ap.encryption,
      ap.signal_dbm ?? '', (ap.clients || []).length,
      ap.first_seen ?? '', ap.last_seen ?? '',
      ap.is_evil_twin ? 'yes' : 'no',
    ]);
  });
  const csv = rows.map(r =>
    r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
  ).join('\r\n');
  downloadText(csv, 'wifye_networks.csv');
}

/* ── Helpers ─────────────────────────────────────────────────── */
function encBadgeClass(enc) {
  switch ((enc || '').toUpperCase()) {
    case 'WPA2': return 'badge-wpa2';
    case 'WPA3': return 'badge-wpa3';
    case 'WPA':  return 'badge-wpa';
    case 'WEP':  return 'badge-wep';
    default:     return 'badge-open';
  }
}

function deviceIcon(dtype) {
  const t = (dtype || '').toLowerCase();
  if (t.includes('dvr') || t.includes('camera')) return '📹';
  if (t.includes('iphone') || t.includes('ipad'))  return '🍎';
  if (t.includes('android'))                        return '🤖';
  if (t.includes('computer'))                       return '💻';
  if (t.includes('router') || t.includes('ap'))     return '📡';
  if (t.includes('smart home') || t.includes('nest')) return '🏠';
  if (t.includes('speaker'))                        return '🔊';
  if (t.includes('streaming') || t.includes('tv'))  return '📺';
  if (t.includes('gaming') || t.includes('playstation') || t.includes('nintendo')) return '🎮';
  if (t.includes('iot'))                            return '🔌';
  if (t.includes('light'))                          return '💡';
  return '📱';
}

function signalHtml(dbm) {
  let cls = 'sig-none';
  if (dbm >= -55)      cls = 'sig-great';
  else if (dbm >= -65) cls = 'sig-good';
  else if (dbm >= -75) cls = 'sig-ok';
  else                 cls = 'sig-weak';
  const h    = [10, 13, 16, 20];
  const bars = h.map(ht => `<span style="height:${ht}px"></span>`).join('');
  return `<div class="signal-bar ${cls}" title="${dbm} dBm">${bars}</div>`;
}

function fmtNum(n) { return n.toLocaleString(); }

function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function sanitizeFilename(s) {
  return String(s ?? 'network').replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 40);
}

function downloadText(content, filename) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ═══════════════════════════════════════════════════════════════
   CRACK PANEL
   ═══════════════════════════════════════════════════════════════ */

function openCrackPanel() {
  const panel = $('crackPanel');
  panel.classList.remove('hidden');
  loadSystemWordlists();
  checkWordgenAvailable();
}

function closeCrackPanel() {
  $('crackPanel').classList.add('hidden');
}

function loadSystemWordlists() {
  const list = $('dictList');
  list.innerHTML = '<div class="dict-loading">Scanning system…</div>';
  fetch('/api/crack/wordlists')
    .then(r => r.json())
    .then(items => {
      if (!items.length) {
        list.innerHTML = '<div class="dict-empty">No wordlists found on this system</div>';
        return;
      }
      list.innerHTML = items.map(it => `
        <label class="dict-item">
          <input type="checkbox" data-path="${escHtml(it.path)}" data-name="${escHtml(it.name)}"
                 data-source="system" data-default="${it.is_default ? '1' : '0'}"
                 onchange="toggleDictSelection(this)" />
          <span class="dict-item-name" title="${escHtml(it.path)}">${escHtml(it.name)}</span>
          <span class="dict-item-size">${escHtml(it.size)}</span>
        </label>`).join('');

      // Auto-select rockyou (or any is_default) without duplicating
      items.filter(it => it.is_default).forEach(it => {
        if (!selectedDicts.find(d => d.path === it.path)) {
          selectedDicts.push({ path: it.path, name: it.name, source: 'system', isDefault: true });
          const cb = list.querySelector(`input[data-path="${CSS.escape(it.path)}"]`);
          if (cb) cb.checked = true;
        }
      });
      renderSelectedDicts();
    })
    .catch(() => {
      list.innerHTML = '<div class="dict-empty">Could not scan wordlists.</div>';
    });
}

function _insertDict(entry) {
  if (selectedDicts.find(d => d.path === entry.path)) return;
  if (entry.isDefault) {
    selectedDicts.push(entry);   // default (rockyou) always goes last
  } else {
    // Insert before the first default (rockyou) so custom dicts appear above it
    const defIdx = selectedDicts.findIndex(d => d.isDefault);
    if (defIdx === -1) selectedDicts.push(entry);
    else selectedDicts.splice(defIdx, 0, entry);
  }
}

function toggleDictSelection(cb) {
  if (cb.checked) {
    _insertDict({
      path: cb.dataset.path, name: cb.dataset.name,
      source: cb.dataset.source, isDefault: cb.dataset.default === '1',
    });
  } else {
    selectedDicts = selectedDicts.filter(d => d.path !== cb.dataset.path);
  }
  renderSelectedDicts();
}

function renderSelectedDicts() {
  const el = $('selectedDicts');
  if (!selectedDicts.length) { el.innerHTML = ''; return; }
  el.innerHTML = selectedDicts.map(d => `
    <span class="selected-dict-chip">
      ${escHtml(d.name)}
      <button onclick="removeDict('${escHtml(d.path)}')" title="Remove">✕</button>
    </span>`).join('');
}

function removeDict(path) {
  selectedDicts = selectedDicts.filter(d => d.path !== path);
  // Uncheck if it's a system list
  document.querySelectorAll(`#dictList input[data-path="${CSS.escape(path)}"]`).forEach(cb => { cb.checked = false; });
  renderSelectedDicts();
}

function uploadDict() {
  const input = $('dictFileInput');
  if (!input.files[0]) return;
  const file = input.files[0];
  $('uploadDictName').textContent = 'Uploading…';
  const form = new FormData();
  form.append('file', file);
  fetch('/api/crack/upload-dict', { method: 'POST', body: form })
    .then(r => r.json())
    .then(data => {
      if (data.error) { $('uploadDictName').textContent = 'Upload failed'; return; }
      uploadedDictPath = data.path;
      $('uploadDictName').textContent = `✓ ${data.name}`;
      _insertDict({ path: data.path, name: data.name, source: 'upload', isDefault: false });
      renderSelectedDicts();
    })
    .catch(() => { $('uploadDictName').textContent = 'Upload failed'; });
}

function checkWordgenAvailable() {
  fetch('/api/wordgen/path')
    .then(r => r.json())
    .then(d => {
      const btn = $('useWordgenBtn');
      if (d.exists) {
        btn.disabled = false;
        btn.title = d.path;
        wordgenPath = d.path;
      } else {
        btn.disabled = true;
        wordgenPath = null;
      }
    })
    .catch(() => {});
}

function useWordgenList() {
  if (!wordgenPath) return;
  _insertDict({ path: wordgenPath, name: 'Generated Wordlist', source: 'wordgen', isDefault: false });
  renderSelectedDicts();
}

function startCrack() {
  if (!analysisData?.hashes?.length) return;
  if (!selectedDicts.length) {
    alert('Select at least one dictionary first.');
    return;
  }

  const hashLines = analysisData.hashes.map(h => h.hash_22000);
  const wordlists = selectedDicts.map(d => d.path);
  const workload  = document.querySelector('input[name="workload"]:checked')?.value || '3';

  $('crackConfig').classList.add('hidden');
  $('crackConsole').classList.remove('hidden');
  crackOutputLine = 0;
  crackRunning    = true;

  // Reset result areas
  $('crackedResults').classList.add('hidden');
  $('crackedResults').innerHTML = '';
  $('crackNoMatch').classList.add('hidden');
  $('crackProgFill').style.width = '0%';
  setCrackBadge('running', 'Running…');
  updateCrackStats({});
  $('stopCrackBtn').disabled = false;

  fetch('/api/crack/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hashes: hashLines, wordlists, workload }),
  })
    .then(r => r.json())
    .then(d => {
      if (d.error) { setCrackBadge('error', 'Error — ' + d.error); crackRunning = false; return; }
      crackPollTimer = setInterval(pollCrackStatus, 2000);
    })
    .catch(err => {
      setCrackBadge('error', 'Failed to start');
      crackRunning = false;
    });
}

function pollCrackStatus() {
  fetch(`/api/crack/status?from=${crackOutputLine}`)
    .then(r => r.json())
    .then(d => {
      crackOutputLine = d.total || crackOutputLine;
      if (d.stats) updateCrackStats(d.stats);

      if (d.done) {
        clearInterval(crackPollTimer);
        crackRunning = false;
        $('stopCrackBtn').disabled = true;

        if (d.cracked?.length) {
          setCrackBadge('cracked', `${d.cracked.length} Password${d.cracked.length > 1 ? 's' : ''} Cracked!`);
          showCrackedCards(d.cracked);
        } else if (d.status === 'stopped') {
          setCrackBadge('stopped', 'Stopped');
          showNoMatch('Search stopped.', 'Try again with a larger dictionary.');
        } else {
          const tried = d.stats?.tried ? d.stats.tried.toLocaleString() : '—';
          const speed = d.stats?.speed || '—';
          setCrackBadge('exhausted', 'Not Found');
          showNoMatch(
            'No passwords matched.',
            `Tested ${tried} candidates at ${speed}. Try rockyou.txt, a larger dictionary, or add more specific seed words.`
          );
        }
      }
    })
    .catch(() => {});
}

function setCrackBadge(state, text) {
  const el = $('crackStatusBadge');
  el.textContent = text;
  el.className   = `crack-result-badge status-${state}`;
}

function updateCrackStats(stats) {
  $('csSpeed').textContent    = stats.speed    || '—';
  $('csProgress').textContent = stats.progress != null ? stats.progress.toFixed(1) + '%' : '0%';
  $('csTested').textContent   = stats.tried    != null ? stats.tried.toLocaleString() : '—';
  $('csElapsed').textContent  = stats.elapsed  || '—';
  if (stats.progress != null)
    $('crackProgFill').style.width = Math.min(stats.progress, 100) + '%';
}

function showCrackedCards(cracked) {
  const el = $('crackedResults');
  el.classList.remove('hidden');
  el.innerHTML = cracked.map(c => `
    <div class="cracked-card">
      <div class="cracked-icon">🔓</div>
      <div class="cracked-info">
        <div class="cracked-ssid">${escHtml(c.ssid || 'Unknown Network')}</div>
        <div class="cracked-pwd-wrap">
          <span class="cracked-pwd">${escHtml(c.password)}</span>
          <button class="cracked-copy-btn" onclick="copyText('${escHtml(c.password)}', this)">Copy</button>
        </div>
      </div>
    </div>`).join('');
}

function showNoMatch(title, hint) {
  const el = $('crackNoMatch');
  el.classList.remove('hidden');
  el.innerHTML = `
    <div class="crack-no-match-icon">
      <svg viewBox="0 0 20 20" fill="none" width="22" height="22">
        <circle cx="10" cy="10" r="8" stroke="var(--text-s)" stroke-width="1.8"/>
        <path d="M7 7l6 6M13 7l-6 6" stroke="var(--text-s)" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    </div>
    <div class="crack-no-match-title">${escHtml(title)}</div>
    <div class="crack-no-match-hint">${escHtml(hint)}</div>`;
}

function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = orig; }, 1500);
  });
}

function stopCrack() {
  fetch('/api/crack/stop', { method: 'POST' }).catch(() => {});
  clearInterval(crackPollTimer);
  crackRunning = false;
  setCrackBadge('stopped', 'Stopping…');
}

function clearCrack() {
  clearInterval(crackPollTimer);
  crackRunning = false;
  fetch('/api/crack/clear', { method: 'POST' }).catch(() => {});
  $('crackedResults').classList.add('hidden');
  $('crackedResults').innerHTML = '';
  $('crackNoMatch').classList.add('hidden');
  $('crackConsole').classList.add('hidden');
  $('crackConfig').classList.remove('hidden');
  // Re-load fresh wordlists (keeps rockyou auto-selected)
  selectedDicts = [];
  loadSystemWordlists();
}

/* ═══════════════════════════════════════════════════════════════
   WORDLIST GENERATOR
   ═══════════════════════════════════════════════════════════════ */

function generateWordlist() {
  const raw    = $('seedWords').value;
  const seeds  = raw.split('\n').map(s => s.trim()).filter(Boolean);
  if (!seeds.length) { alert('Enter at least one seed word.'); return; }

  const options = {
    capitals: $('optCapitals').checked,
    leet:     $('optLeet').checked,
    numbers:  $('optNumbers').checked,
    special:  $('optSpecial').checked,
    combos:   $('optCombos').checked,
    prefixes: $('optPrefixes').checked,
  };

  fetch('/api/wordgen', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seeds, options }),
  })
    .then(r => r.json())
    .then(d => {
      if (d.error) { alert(d.error); return; }
      wordgenWords = d.preview;    // preview only; full list is server-side
      wordgenPath  = d.path;

      $('wgCount').textContent = `${d.count.toLocaleString()} passwords generated`;
      $('wgPreview').textContent = (d.preview || []).join('  ·  ') + (d.count > 30 ? '  …' : '');
      $('wgResult').classList.remove('hidden');

      // Enable "use for cracking" button
      const btn = $('useWordgenBtn');
      if (btn) { btn.disabled = false; btn.title = d.path; }
    })
    .catch(err => alert('Error: ' + err));
}

function downloadWordlist() {
  const seeds = $('seedWords').value.split('\n').map(s => s.trim()).filter(Boolean);
  if (!seeds.length) return;
  fetch('/api/wordgen', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      seeds,
      full: true,
      options: {
        capitals: $('optCapitals').checked,
        leet:     $('optLeet').checked,
        numbers:  $('optNumbers').checked,
        special:  $('optSpecial').checked,
        combos:   $('optCombos').checked,
        prefixes: $('optPrefixes').checked,
      },
    }),
  })
    .then(r => r.json())
    .then(d => {
      if (d.words?.length) downloadText(d.words.join('\n') + '\n', 'wifye_wordlist.txt');
    })
    .catch(() => {});
}

function copyToClipboardWordlist() {
  if (!wordgenWords.length) return;
  navigator.clipboard.writeText(wordgenWords.join('\n')).then(() => {
    const btn = document.querySelector('.btn-gold');
    if (btn) {
      const orig = btn.innerHTML;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.innerHTML = orig; }, 1500);
    }
  });
}
