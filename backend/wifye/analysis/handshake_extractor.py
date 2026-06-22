import struct

from scapy.all import PcapReader
from scapy.layers.dot11 import Dot11, Dot11Beacon, Dot11Elt, Dot11ProbeResp

from ..common.mac_utils import mac_to_display, mac_to_hex


def _is_pairwise(key_info): return bool(key_info & 0x0008)
def _is_ack(key_info):      return bool(key_info & 0x0080)
def _is_mic(key_info):      return bool(key_info & 0x0100)
def _is_install(key_info):  return bool(key_info & 0x0040)


def _msg_type(key_info):
    if not _is_pairwise(key_info):
        return 0
    ack, mic, install = _is_ack(key_info), _is_mic(key_info), _is_install(key_info)
    if ack and not mic and not install:
        return 1
    if not ack and mic and not install:
        return 2
    if ack and mic and install:
        return 3
    return 0


def _parse_eapol_key(raw_key_body):
    if len(raw_key_body) < 95:
        return None
    try:
        off = 1  # skip descriptor_type
        key_info = struct.unpack('>H', raw_key_body[off:off + 2])[0]; off += 2
        off += 2  # skip key_length
        replay_counter = raw_key_body[off:off + 8]; off += 8
        nonce          = raw_key_body[off:off + 32]; off += 32
        off += 16  # skip key_iv
        off += 8   # skip key_rsc
        off += 8   # skip key_id
        key_mic        = raw_key_body[off:off + 16]; off += 16
        kdlen          = struct.unpack('>H', raw_key_body[off:off + 2])[0]; off += 2
        key_data       = raw_key_body[off:off + kdlen] if kdlen > 0 else b''
        return {
            'key_info': key_info, 'replay_counter': replay_counter,
            'nonce': nonce, 'key_mic': key_mic, 'key_data': key_data,
        }
    except Exception:
        return None


def _extract_pmkid(key_data):
    """Search for a PMKID KDE (OUI 00:0f:ac type 04) in EAPOL M1 key data."""
    if not key_data:
        return None
    i = 0
    while i < len(key_data) - 5:
        if key_data[i] == 0xDD and i + 1 < len(key_data):
            kde_len = key_data[i + 1]
            if kde_len >= 20 and i + 2 + kde_len <= len(key_data):
                body = key_data[i + 2:i + 2 + kde_len]
                if body[:3] == b'\x00\x0f\xac' and body[3] == 0x04:
                    pmkid = body[4:20]
                    if len(pmkid) == 16:
                        return pmkid
            i += 2 + kde_len
        else:
            i += 1
    return None


class HashFormat22000:
    """Builds hashcat -m 22000 hash lines for EAPOL and PMKID handshakes."""

    _MIC_OFFSET = 81

    @classmethod
    def eapol(cls, ssid, ap_mac, sta_mac, anonce, eapol_bytes, mic):
        eapol_for_hash = bytearray(eapol_bytes)
        if len(eapol_for_hash) >= cls._MIC_OFFSET + 16:
            eapol_for_hash[cls._MIC_OFFSET:cls._MIC_OFFSET + 16] = b'\x00' * 16
        ssid_hex = ssid.encode('utf-8', errors='replace').hex()
        return (f"WPA*02*{mic.hex()}*{mac_to_hex(ap_mac)}*{mac_to_hex(sta_mac)}*"
                f"{ssid_hex}*{anonce.hex()}*{bytes(eapol_for_hash).hex()}*02")

    @staticmethod
    def pmkid(ssid, ap_mac, sta_mac, pmkid):
        ssid_hex = ssid.encode('utf-8', errors='replace').hex()
        return f"WPA*01*{pmkid.hex()}*{mac_to_hex(ap_mac)}*{mac_to_hex(sta_mac)}*{ssid_hex}***"


class HandshakeExtractor:
    """Extracts WPA EAPOL handshakes and PMKIDs from a pcap via a two-pass Scapy read."""

    def extract(self, filepath):
        ssid_map = self._build_ssid_map(filepath)
        if ssid_map is None:
            return []
        sessions = self._collect_eapol_sessions(filepath)
        if sessions is None:
            return []
        return self._build_results(sessions, ssid_map)

    @staticmethod
    def _build_ssid_map(filepath):
        bssid_ssid = {}
        try:
            with PcapReader(filepath) as reader:
                for pkt in reader:
                    if not pkt.haslayer(Dot11):
                        continue
                    dot11 = pkt[Dot11]
                    if not (pkt.haslayer(Dot11Beacon) or pkt.haslayer(Dot11ProbeResp)):
                        continue
                    bssid = dot11.addr3
                    if not bssid:
                        continue
                    elt = pkt.getlayer(Dot11Elt)
                    while elt and isinstance(elt, Dot11Elt):
                        if elt.ID == 0:
                            try:
                                ssid = elt.info.decode('utf-8', errors='replace').strip('\x00')
                                if ssid:
                                    bssid_ssid[bssid.upper()] = ssid
                            except Exception:
                                pass
                            break
                        try:
                            elt = elt.payload if isinstance(elt.payload, Dot11Elt) else None
                        except Exception:
                            break
        except Exception:
            return None
        return bssid_ssid

    @staticmethod
    def _collect_eapol_sessions(filepath):
        sessions = {}
        try:
            with PcapReader(filepath) as reader:
                for pkt in reader:
                    if not pkt.haslayer(Dot11):
                        continue
                    dot11 = pkt[Dot11]
                    try:
                        raw = bytes(pkt)
                    except Exception:
                        continue

                    eapol_start = None
                    for i in range(len(raw) - 10):
                        if raw[i] == 0x88 and raw[i + 1] == 0x8e:
                            eapol_start = i + 2
                            break
                    if eapol_start is None:
                        continue

                    eapol_frame = raw[eapol_start:]
                    if len(eapol_frame) < 99 or eapol_frame[1] != 3:
                        continue

                    key_data = _parse_eapol_key(eapol_frame[4:])
                    if not key_data:
                        continue

                    msg = _msg_type(key_data['key_info'])
                    if msg == 0:
                        continue

                    addr1, addr2 = dot11.addr1, dot11.addr2
                    if not addr1 or not addr2:
                        continue

                    if msg == 1:
                        ap_mac, sta_mac = addr2.upper(), addr1.upper()
                    else:
                        sta_mac, ap_mac = addr2.upper(), addr1.upper()

                    if ap_mac == 'FF:FF:FF:FF:FF:FF' or sta_mac == 'FF:FF:FF:FF:FF:FF':
                        continue

                    session = sessions.setdefault((ap_mac, sta_mac), {'msg1': [], 'msg2': [], 'pmkid': None})

                    if msg == 1:
                        session['msg1'].append({
                            'anonce': key_data['nonce'],
                            'replay_counter': key_data['replay_counter'],
                            'raw_eapol': eapol_frame,
                        })
                        if session['pmkid'] is None:
                            pmkid = _extract_pmkid(key_data['key_data'])
                            if pmkid:
                                session['pmkid'] = pmkid
                    elif msg == 2:
                        session['msg2'].append({
                            'mic': key_data['key_mic'],
                            'replay_counter': key_data['replay_counter'],
                            'raw_eapol': eapol_frame,
                        })
        except Exception:
            return None
        return sessions

    @staticmethod
    def _find_matching_pair(msg1_list, msg2_list):
        for m1 in msg1_list:
            for m2 in msg2_list:
                if m1['replay_counter'] == m2['replay_counter']:
                    return m1, m2
        return None

    def _build_results(self, sessions, bssid_ssid):
        hashes = []
        seen_pmkid_pairs = set()

        for (ap_mac, sta_mac), session in sessions.items():
            ssid = bssid_ssid.get(ap_mac, '<unknown>')

            if session['pmkid'] and (ap_mac, sta_mac) not in seen_pmkid_pairs:
                seen_pmkid_pairs.add((ap_mac, sta_mac))
                hashes.append({
                    'ssid': ssid, 'bssid': mac_to_display(ap_mac), 'client_mac': mac_to_display(sta_mac),
                    'hash_22000': HashFormat22000.pmkid(ssid, ap_mac, sta_mac, session['pmkid']),
                    'has_full_handshake': True, 'hash_type': 'PMKID',
                })

            if not session['msg1'] or not session['msg2']:
                continue

            matched_pair = self._find_matching_pair(session['msg1'], session['msg2'])
            m1, m2 = matched_pair or (session['msg1'][0], session['msg2'][0])
            hashes.append({
                'ssid': ssid, 'bssid': mac_to_display(ap_mac), 'client_mac': mac_to_display(sta_mac),
                'hash_22000': HashFormat22000.eapol(ssid, ap_mac, sta_mac, m1['anonce'], m2['raw_eapol'], m2['mic']),
                'has_full_handshake': matched_pair is not None, 'hash_type': 'EAPOL',
            })

        return hashes
