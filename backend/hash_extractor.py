import struct
from scapy.all import PcapReader
from scapy.layers.dot11 import Dot11, Dot11Beacon, Dot11ProbeResp, Dot11Elt


def _normalize_mac_hex(mac):
    if not mac:
        return '000000000000'
    return mac.lower().replace(':', '').replace('-', '')


def _normalize_mac_display(mac):
    h = _normalize_mac_hex(mac)
    return ':'.join(h[i:i+2] for i in range(0, 12, 2)).upper()


def _parse_eapol_key(raw_key_body):
    if len(raw_key_body) < 95:
        return None
    try:
        off = 0
        descriptor_type = raw_key_body[off]; off += 1
        key_info   = struct.unpack('>H', raw_key_body[off:off+2])[0]; off += 2
        key_length = struct.unpack('>H', raw_key_body[off:off+2])[0]; off += 2
        replay_counter = raw_key_body[off:off+8];  off += 8
        nonce          = raw_key_body[off:off+32]; off += 32
        key_iv         = raw_key_body[off:off+16]; off += 16
        key_rsc        = raw_key_body[off:off+8];  off += 8
        key_id         = raw_key_body[off:off+8];  off += 8
        key_mic        = raw_key_body[off:off+16]; off += 16
        kdlen          = struct.unpack('>H', raw_key_body[off:off+2])[0]; off += 2
        key_data       = raw_key_body[off:off+kdlen] if kdlen > 0 else b''
        return {
            'key_info':      key_info,
            'replay_counter': replay_counter,
            'nonce':         nonce,
            'key_mic':       key_mic,
            'key_data':      key_data,
        }
    except Exception:
        return None


def _extract_pmkid(key_data):
    """Search for PMKID KDE (OUI 00:0F:AC type 04) in EAPOL M1 key data."""
    if not key_data:
        return None
    i = 0
    while i < len(key_data) - 5:
        if key_data[i] == 0xDD and i + 1 < len(key_data):
            kde_len = key_data[i + 1]
            if kde_len >= 20 and i + 2 + kde_len <= len(key_data):
                body = key_data[i + 2: i + 2 + kde_len]
                if body[:3] == b'\x00\x0f\xac' and body[3] == 0x04:
                    pmkid = body[4:20]
                    if len(pmkid) == 16:
                        return pmkid
            i += 2 + kde_len
        else:
            i += 1
    return None


def _is_pairwise(ki): return bool(ki & 0x0008)
def _is_ack(ki):      return bool(ki & 0x0080)
def _is_mic(ki):      return bool(ki & 0x0100)
def _is_install(ki):  return bool(ki & 0x0040)


def _msg_type(ki):
    if not _is_pairwise(ki):
        return 0
    ack  = _is_ack(ki)
    mic  = _is_mic(ki)
    inst = _is_install(ki)
    if ack and not mic and not inst:
        return 1
    if not ack and mic and not inst:
        return 2
    if ack and mic and inst:
        return 3
    return 0


def _build_eapol_22000(ssid, ap_mac, sta_mac, anonce, eapol_bytes, mic):
    MIC_OFFSET = 81
    eapol_for_hash = bytearray(eapol_bytes)
    if len(eapol_for_hash) >= MIC_OFFSET + 16:
        eapol_for_hash[MIC_OFFSET:MIC_OFFSET + 16] = b'\x00' * 16

    ap_hex     = _normalize_mac_hex(ap_mac)
    sta_hex    = _normalize_mac_hex(sta_mac)
    ssid_hex   = ssid.encode('utf-8', errors='replace').hex()
    anonce_hex = anonce.hex()
    eapol_hex  = bytes(eapol_for_hash).hex()
    mic_hex    = mic.hex()
    return f"WPA*02*{mic_hex}*{ap_hex}*{sta_hex}*{ssid_hex}*{anonce_hex}*{eapol_hex}*02"


def _build_pmkid_22000(ssid, ap_mac, sta_mac, pmkid):
    ap_hex    = _normalize_mac_hex(ap_mac)
    sta_hex   = _normalize_mac_hex(sta_mac)
    ssid_hex  = ssid.encode('utf-8', errors='replace').hex()
    pmkid_hex = pmkid.hex()
    return f"WPA*01*{pmkid_hex}*{ap_hex}*{sta_hex}*{ssid_hex}***"


def extract_hashes(filepath):
    # Pass 1: collect SSID per BSSID
    bssid_ssid = {}
    try:
        with PcapReader(filepath) as reader:
            for pkt in reader:
                if not pkt.haslayer(Dot11):
                    continue
                dot11 = pkt[Dot11]
                if pkt.haslayer(Dot11Beacon) or pkt.haslayer(Dot11ProbeResp):
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
        return []

    # Pass 2: gather EAPOL frames
    sessions = {}  # (ap_mac, sta_mac) -> {msg1:[], msg2:[], pmkid: bytes|None}

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
                if len(eapol_frame) < 99:
                    continue

                eapol_type = eapol_frame[1]
                if eapol_type != 3:
                    continue

                key_data = _parse_eapol_key(eapol_frame[4:])
                if not key_data:
                    continue

                ki  = key_data['key_info']
                msg = _msg_type(ki)
                if msg == 0:
                    continue

                addr1 = dot11.addr1
                addr2 = dot11.addr2
                if not addr1 or not addr2:
                    continue

                if msg == 1:
                    ap_mac, sta_mac = addr2.upper(), addr1.upper()
                else:
                    sta_mac, ap_mac = addr2.upper(), addr1.upper()

                if ap_mac == 'FF:FF:FF:FF:FF:FF' or sta_mac == 'FF:FF:FF:FF:FF:FF':
                    continue

                key = (ap_mac, sta_mac)
                if key not in sessions:
                    sessions[key] = {'msg1': [], 'msg2': [], 'pmkid': None}

                if msg == 1:
                    sessions[key]['msg1'].append({
                        'anonce':          key_data['nonce'],
                        'replay_counter':  key_data['replay_counter'],
                        'raw_eapol':       eapol_frame,
                    })
                    # Try PMKID extraction from M1 key data
                    if sessions[key]['pmkid'] is None:
                        pmkid = _extract_pmkid(key_data['key_data'])
                        if pmkid:
                            sessions[key]['pmkid'] = pmkid
                elif msg == 2:
                    sessions[key]['msg2'].append({
                        'mic':            key_data['key_mic'],
                        'replay_counter': key_data['replay_counter'],
                        'raw_eapol':      eapol_frame,
                    })
    except Exception:
        return []

    # Build results
    hashes = []
    seen_pmkid_pairs = set()

    for (ap_mac, sta_mac), sess in sessions.items():
        ssid = bssid_ssid.get(ap_mac, '<unknown>')

        # PMKID hash (needs only M1 with PMKID KDE)
        if sess['pmkid'] and (ap_mac, sta_mac) not in seen_pmkid_pairs:
            seen_pmkid_pairs.add((ap_mac, sta_mac))
            hashes.append({
                'ssid':               ssid,
                'bssid':              _normalize_mac_display(ap_mac),
                'client_mac':         _normalize_mac_display(sta_mac),
                'hash_22000':         _build_pmkid_22000(ssid, ap_mac, sta_mac, sess['pmkid']),
                'has_full_handshake': True,
                'hash_type':          'PMKID',
            })

        # EAPOL hash (needs M1 + M2 pair)
        if not sess['msg1'] or not sess['msg2']:
            continue

        matched = False
        for m1 in sess['msg1']:
            for m2 in sess['msg2']:
                if m1['replay_counter'] == m2['replay_counter']:
                    hashes.append({
                        'ssid':               ssid,
                        'bssid':              _normalize_mac_display(ap_mac),
                        'client_mac':         _normalize_mac_display(sta_mac),
                        'hash_22000':         _build_eapol_22000(ssid, ap_mac, sta_mac, m1['anonce'], m2['raw_eapol'], m2['mic']),
                        'has_full_handshake': True,
                        'hash_type':          'EAPOL',
                    })
                    matched = True
                    break
            if matched:
                break

        if not matched:
            m1, m2 = sess['msg1'][0], sess['msg2'][0]
            hashes.append({
                'ssid':               ssid,
                'bssid':              _normalize_mac_display(ap_mac),
                'client_mac':         _normalize_mac_display(sta_mac),
                'hash_22000':         _build_eapol_22000(ssid, ap_mac, sta_mac, m1['anonce'], m2['raw_eapol'], m2['mic']),
                'has_full_handshake': False,
                'hash_type':          'EAPOL',
            })

    return hashes
