from datetime import datetime

from ..common.mac_utils import is_valid_mac
from .device_fingerprinter import DeviceFingerprinter
from .frame_parser import FrameParser, ParserError
from .threat_detector import DeauthFloodDetector, EvilTwinDetector


def fmt_ts(ts):
    if ts is None:
        return None
    try:
        return datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S')
    except Exception:
        return None


class PcapAnalyzer:
    """Builds a network/client/threat summary from a pcap, orchestrating the
    frame parser, device fingerprinter and threat detectors."""

    def __init__(self, frame_parser=None, fingerprinter=None,
                 evil_twin_detector=None, deauth_detector=None):
        self._parser = frame_parser or FrameParser()
        self._fingerprint = fingerprinter or DeviceFingerprinter()
        self._evil_twin = evil_twin_detector or EvilTwinDetector()
        self._deauth = deauth_detector or DeauthFloodDetector()

    def analyze(self, filepath):
        try:
            data = self._parser.parse(filepath)
        except ParserError as exc:
            return {'error': str(exc), 'networks': [], 'summary': {}}

        frames = data.get('frames', [])
        total_packets = data.get('total', 0)

        aps, clients, assoc, timestamps, probe_requests, deauth_counts = self._process_frames(frames)

        networks = self._build_networks(aps, clients, assoc)
        evil_twins = self._evil_twin.detect(networks)
        evil_ssids = {e['ssid'] for e in evil_twins}
        for net in networks:
            net['is_evil_twin'] = net['ssid'] in evil_ssids

        return {
            'summary': {
                'total_aps':     len(networks),
                'total_clients': len(set(assoc) | set(probe_requests)),
                'total_packets': total_packets,
                'scan_duration': self._format_duration(timestamps),
            },
            'networks':      networks,
            'probes':        self._build_probes(probe_requests, clients),
            'deauth_floods': self._deauth.detect(deauth_counts, self._fingerprint.vendor_for),
            'evil_twins':    evil_twins,
            'channel_usage': self._build_channel_usage(aps),
        }

    def _process_frames(self, frames):
        aps, clients, assoc = {}, {}, {}
        timestamps = []
        probe_requests = {}
        deauth_counts = {}

        for f in frames:
            ftype = f.get('type')
            ts = f.get('ts')
            sig = f.get('sig')
            bssid = f.get('bssid')
            client = f.get('client')
            ssid = f.get('ssid', '')

            if ts:
                timestamps.append(ts)

            if ftype in ('beacon', 'probe_resp'):
                self._record_ap(aps, bssid, ssid, f, ts, sig)
            elif ftype == 'probe_req':
                self._record_probe_request(probe_requests, clients, client, ssid, f, sig)
            elif ftype in ('deauth', 'disassoc'):
                if client:
                    deauth_counts[client] = deauth_counts.get(client, 0) + 1
            elif ftype == 'assoc_req':
                self._record_assoc(assoc, clients, client, bssid, f, sig)
            elif ftype == 'eapol':
                self._record_eapol(assoc, clients, client, bssid, sig)

        return aps, clients, assoc, timestamps, probe_requests, deauth_counts

    @staticmethod
    def _record_ap(aps, bssid, ssid, frame, ts, sig):
        if not bssid:
            return
        if bssid not in aps:
            aps[bssid] = {
                'ssid': ssid or '<hidden>', 'bssid': bssid,
                'channel': frame.get('ch', 0), 'encryption': frame.get('enc', 'Open'),
                'signal_dbm': sig, 'first_seen': ts, 'last_seen': ts,
            }
            return
        ap = aps[bssid]
        if sig is not None:
            ap['signal_dbm'] = sig
        if ts is not None:
            if ap['first_seen'] is None or ts < ap['first_seen']:
                ap['first_seen'] = ts
            if ap['last_seen'] is None or ts > ap['last_seen']:
                ap['last_seen'] = ts

    def _record_probe_request(self, probe_requests, clients, client, ssid, frame, sig):
        if not client or not is_valid_mac(client):
            return
        if ssid:
            probe_requests.setdefault(client, set()).add(ssid)
        if client not in clients:
            identity = self._fingerprint.identify(client, frame, ssid)
            clients[client] = {'mac': client, 'vendor': identity.vendor,
                                'device_type': identity.device_type, 'signal_dbm': sig}
        elif clients[client]['device_type'] == 'Unknown Device' and ssid:
            _, fp_dtype = self._fingerprint.fingerprint_from_frame({}, ssid)
            if fp_dtype:
                clients[client]['device_type'] = fp_dtype

    def _record_assoc(self, assoc, clients, client, bssid, frame, sig):
        if not client or not bssid or not is_valid_mac(client):
            return
        assoc[client] = bssid
        if client not in clients:
            identity = self._fingerprint.identify(client, frame)
            clients[client] = {'mac': client, 'vendor': identity.vendor,
                                'device_type': identity.device_type, 'signal_dbm': sig}

    def _record_eapol(self, assoc, clients, client, bssid, sig):
        if not (client and bssid and is_valid_mac(client)):
            return
        if client not in assoc:
            assoc[client] = bssid
        if client not in clients:
            identity = self._fingerprint.oui_identity(client)
            clients[client] = {'mac': client, 'vendor': identity.vendor,
                                'device_type': identity.device_type, 'signal_dbm': sig}

    @staticmethod
    def _build_networks(aps, clients, assoc):
        networks = []
        for bssid, ap in aps.items():
            ap_clients = [
                clients[mac] for mac, b in assoc.items()
                if b == bssid and mac in clients and is_valid_mac(mac)
            ]
            networks.append({
                'ssid': ap['ssid'], 'bssid': ap['bssid'], 'channel': ap.get('channel', 0),
                'encryption': ap.get('encryption', 'Unknown'), 'signal_dbm': ap.get('signal_dbm'),
                'first_seen': fmt_ts(ap.get('first_seen')), 'last_seen': fmt_ts(ap.get('last_seen')),
                'clients': ap_clients,
            })
        networks.sort(key=lambda net: len(net['clients']), reverse=True)
        return networks

    @staticmethod
    def _build_channel_usage(aps):
        usage = {}
        for ap in aps.values():
            ch = ap.get('channel', 0)
            if ch:
                usage[str(ch)] = usage.get(str(ch), 0) + 1
        return usage

    @staticmethod
    def _build_probes(probe_requests, clients):
        return sorted([
            {
                'client_mac': mac,
                'vendor': clients.get(mac, {}).get('vendor', 'Unknown'),
                'device_type': clients.get(mac, {}).get('device_type', 'Unknown Device'),
                'probed_ssids': sorted(ssids),
            }
            for mac, ssids in probe_requests.items()
        ], key=lambda p: -len(p['probed_ssids']))

    @staticmethod
    def _format_duration(timestamps):
        if len(timestamps) < 2:
            return ''
        secs = int(max(timestamps) - min(timestamps))
        h, rem = divmod(secs, 3600)
        m, s = divmod(rem, 60)
        return f'{h:02d}:{m:02d}:{s:02d}'
