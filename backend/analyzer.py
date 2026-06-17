import json
import os
import subprocess
from datetime import datetime
from oui_db import get_vendor, get_device_type

DEAUTH_FLOOD_THRESHOLD = 20
_PARSER_BIN = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'parser')

_SSID_FINGERPRINTS = [
    (['hikvision'],                   ('Hikvision',        'DVR/Camera')),
    (['dahua'],                        ('Dahua Technology', 'DVR/Camera')),
    (['reolink'],                      ('Reolink',          'IP Camera')),
    (['ezviz'],                        ('EZVIZ',            'IP Camera')),
    (['amcrest'],                      ('Amcrest',          'IP Camera')),
    (['foscam'],                       ('Foscam',           'IP Camera')),
    (['uniview'],                      ('Uniview',          'DVR/Camera')),
    (['hanwha', 'wisenet'],            ('Hanwha',           'DVR/Camera')),
    (['vivotek'],                      ('Vivotek',          'IP Camera')),
    (['flir'],                         ('FLIR',             'IP Camera')),
    (['dvr', 'nvr', 'cctv', 'ipcam'], (None,               'DVR/NVR')),
]


def _ensure_parser():
    """Compile parser.c if the binary is missing or stale."""
    src = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'parser.c')
    if os.path.exists(_PARSER_BIN):
        return None
    if not os.path.exists(src):
        return "parser.c not found in backend/"
    try:
        r = subprocess.run(
            ['gcc', '-O2', '-o', _PARSER_BIN, src],
            capture_output=True, text=True, timeout=30
        )
        if r.returncode != 0:
            return f"gcc failed: {r.stderr}"
        return None
    except FileNotFoundError:
        return "gcc not found. Install with: brew install gcc"
    except Exception as e:
        return str(e)


def fingerprint_from_frame(frame, probed_ssid=''):
    """Identify device type from C-parser frame dict without using MAC."""
    if probed_ssid:
        s = probed_ssid.lower()
        for keywords, result in _SSID_FINGERPRINTS:
            if any(kw in s for kw in keywords):
                return result

    has_ht  = bool(frame.get('ht', 0))
    has_vht = bool(frame.get('vht', 0))
    rates   = frame.get('rates', [])
    max_rate = max(rates) if rates else 0
    has_wps = bool(frame.get('wps', 0))

    if not has_ht and has_wps:
        return (None, 'IoT Device')
    if not has_ht and not has_vht and 0 < max_rate <= 54:
        return (None, 'IoT Device')
    return (None, None)


def _resolve_identity(oui_vendor, oui_dtype, fp_vendor, fp_dtype):
    vendor = oui_vendor if oui_vendor != 'Unknown'        else (fp_vendor or 'Unknown')
    dtype  = oui_dtype  if oui_dtype  != 'Unknown Device' else (fp_dtype  or 'Unknown Device')
    return vendor, dtype


def normalize_mac(mac):
    return mac.upper() if mac else None


def is_valid_mac(mac):
    if not mac:
        return False
    if mac in ('FF:FF:FF:FF:FF:FF', '00:00:00:00:00:00'):
        return False
    try:
        if int(mac.split(':')[0], 16) & 0x01:
            return False
    except Exception:
        return False
    return True


def fmt_ts(ts):
    if ts is None:
        return None
    try:
        return datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S')
    except Exception:
        return None


def analyze_pcap(filepath):
    err = _ensure_parser()
    if err:
        return {"error": err, "networks": [], "summary": {}}

    try:
        result = subprocess.run(
            [_PARSER_BIN, filepath],
            capture_output=True, text=True, timeout=180
        )
        if result.returncode != 0:
            return {"error": f"Parser error: {result.stderr[:300]}", "networks": [], "summary": {}}
        data = json.loads(result.stdout)
    except subprocess.TimeoutExpired:
        return {"error": "Parsing timed out (file too large?)", "networks": [], "summary": {}}
    except json.JSONDecodeError as e:
        return {"error": f"Parser output corrupt: {e}", "networks": [], "summary": {}}
    except Exception as e:
        return {"error": str(e), "networks": [], "summary": {}}

    frames       = data.get('frames', [])
    total_packets = data.get('total', 0)

    aps            = {}
    clients        = {}
    assoc          = {}
    timestamps     = []
    probe_requests = {}
    deauth_counts  = {}

    for f in frames:
        ftype  = f.get('type')
        ts     = f.get('ts')
        sig    = f.get('sig')
        bssid  = f.get('bssid')
        client = f.get('client')
        ssid   = f.get('ssid', '')

        if ts:
            timestamps.append(ts)

        # ── Beacon / Probe Response ──────────────────────────────
        if ftype in ('beacon', 'probe_resp'):
            if not bssid:
                continue
            enc = f.get('enc', 'Open')
            ch  = f.get('ch', 0)

            if bssid not in aps:
                aps[bssid] = {
                    'ssid':       ssid or '<hidden>',
                    'bssid':      bssid,
                    'channel':    ch,
                    'encryption': enc,
                    'signal_dbm': sig,
                    'first_seen': ts,
                    'last_seen':  ts,
                }
            else:
                if sig is not None:
                    aps[bssid]['signal_dbm'] = sig
                if ts is not None:
                    if aps[bssid]['first_seen'] is None or ts < aps[bssid]['first_seen']:
                        aps[bssid]['first_seen'] = ts
                    if aps[bssid]['last_seen'] is None or ts > aps[bssid]['last_seen']:
                        aps[bssid]['last_seen'] = ts

        # ── Probe Request ────────────────────────────────────────
        elif ftype == 'probe_req':
            if not client or not is_valid_mac(client):
                continue
            if ssid:
                probe_requests.setdefault(client, set()).add(ssid)
            if client not in clients:
                oui_v, oui_d  = get_vendor(client), get_device_type(client)
                fp_v, fp_d    = fingerprint_from_frame(f, ssid)
                vendor, dtype = _resolve_identity(oui_v, oui_d, fp_v, fp_d)
                clients[client] = {
                    'mac': client, 'vendor': vendor,
                    'device_type': dtype, 'signal_dbm': sig,
                }
            elif clients[client]['device_type'] == 'Unknown Device' and ssid:
                _, fp_d = fingerprint_from_frame({}, ssid)
                if fp_d:
                    clients[client]['device_type'] = fp_d

        # ── Deauth / Disassoc ────────────────────────────────────
        elif ftype in ('deauth', 'disassoc'):
            if client:
                deauth_counts[client] = deauth_counts.get(client, 0) + 1

        # ── Association Request ──────────────────────────────────
        elif ftype == 'assoc_req':
            if not client or not bssid or not is_valid_mac(client):
                continue
            assoc[client] = bssid
            if client not in clients:
                oui_v, oui_d  = get_vendor(client), get_device_type(client)
                fp_v, fp_d    = fingerprint_from_frame(f)
                vendor, dtype = _resolve_identity(oui_v, oui_d, fp_v, fp_d)
                clients[client] = {
                    'mac': client, 'vendor': vendor,
                    'device_type': dtype, 'signal_dbm': sig,
                }

        # ── EAPOL ───────────────────────────────────────────────
        elif ftype == 'eapol':
            if client and bssid and is_valid_mac(client):
                if client not in assoc:
                    assoc[client] = bssid
                if client not in clients:
                    oui_v, oui_d = get_vendor(client), get_device_type(client)
                    clients[client] = {
                        'mac': client, 'vendor': oui_v,
                        'device_type': oui_d, 'signal_dbm': sig,
                    }

    # ── Build network list ───────────────────────────────────────
    networks = []
    for bssid, ap in aps.items():
        ap_clients = [
            clients[m] for m, b in assoc.items()
            if b == bssid and m in clients and is_valid_mac(m)
        ]
        networks.append({
            'ssid':       ap['ssid'],
            'bssid':      ap['bssid'],
            'channel':    ap.get('channel', 0),
            'encryption': ap.get('encryption', 'Unknown'),
            'signal_dbm': ap.get('signal_dbm'),
            'first_seen': fmt_ts(ap.get('first_seen')),
            'last_seen':  fmt_ts(ap.get('last_seen')),
            'clients':    ap_clients,
        })
    networks.sort(key=lambda x: len(x['clients']), reverse=True)

    # ── Evil twin detection ──────────────────────────────────────
    ssid_bssids = {}
    for net in networks:
        if net['ssid'] != '<hidden>':
            ssid_bssids.setdefault(net['ssid'], []).append(net['bssid'])
    evil_twins = [
        {'ssid': s, 'bssids': bs}
        for s, bs in ssid_bssids.items() if len(bs) > 1
    ]
    evil_ssids = {e['ssid'] for e in evil_twins}
    for net in networks:
        net['is_evil_twin'] = net['ssid'] in evil_ssids

    # ── Channel usage ────────────────────────────────────────────
    channel_usage = {}
    for ap in aps.values():
        ch = ap.get('channel', 0)
        if ch:
            channel_usage[str(ch)] = channel_usage.get(str(ch), 0) + 1

    # ── Deauth floods ─────────────────────────────────────────────
    deauth_floods = [
        {'src_mac': mac, 'vendor': get_vendor(mac), 'count': cnt}
        for mac, cnt in sorted(deauth_counts.items(), key=lambda x: -x[1])
        if cnt >= DEAUTH_FLOOD_THRESHOLD
    ]

    # ── Probe requests ────────────────────────────────────────────
    probes = sorted([
        {
            'client_mac':   mac,
            'vendor':       clients.get(mac, {}).get('vendor', 'Unknown'),
            'device_type':  clients.get(mac, {}).get('device_type', 'Unknown Device'),
            'probed_ssids': sorted(ssids),
        }
        for mac, ssids in probe_requests.items()
    ], key=lambda x: -len(x['probed_ssids']))

    # ── Duration ─────────────────────────────────────────────────
    scan_duration = ''
    if len(timestamps) >= 2:
        secs = int(max(timestamps) - min(timestamps))
        h, rem = divmod(secs, 3600)
        m, s   = divmod(rem, 60)
        scan_duration = f"{h:02d}:{m:02d}:{s:02d}"

    return {
        'summary': {
            'total_aps':      len(networks),
            'total_clients':  len(set(assoc) | set(probe_requests)),
            'total_packets':  total_packets,
            'scan_duration':  scan_duration,
        },
        'networks':      networks,
        'probes':        probes,
        'deauth_floods': deauth_floods,
        'evil_twins':    evil_twins,
        'channel_usage': channel_usage,
    }
