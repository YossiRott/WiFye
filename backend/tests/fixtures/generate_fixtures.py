"""
One-time generator for the synthetic pcap fixtures under tests/fixtures/pcaps/.

These pcaps are hand-built with Scapy so test expectations are fully
deterministic (no real capture hardware needed). Run manually whenever a
fixture needs to be regenerated; the resulting .pcap files are committed:

    python3 tests/fixtures/generate_fixtures.py
"""
import os
import struct

from scapy.all import RadioTap, wrpcap
from scapy.layers.dot11 import (
    Dot11,
    Dot11Beacon,
    Dot11Deauth,
    Dot11Elt,
    Dot11ProbeReq,
)
from scapy.layers.eap import EAPOL

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pcaps')

AP_MAC = '02:11:22:33:44:55'
AP2_MAC = '02:11:22:33:44:66'
STA_MAC = '02:aa:bb:cc:dd:ee'


def _beacon(bssid, ssid, channel=6, privacy=True):
    cap = 'ESS+privacy' if privacy else 'ESS'
    return (
        RadioTap()
        / Dot11(type=0, subtype=8, addr1='ff:ff:ff:ff:ff:ff', addr2=bssid, addr3=bssid)
        / Dot11Beacon(cap=cap)
        / Dot11Elt(ID=0, info=ssid.encode())
        / Dot11Elt(ID=3, info=bytes([channel]))
    )


def _eapol_key_frame(addr1, addr2, addr3, key_info, replay_counter, nonce, key_mic, key_data=b''):
    """Build a raw 802.11 data frame carrying an EAPOL-Key body, matching the
    byte layout HandshakeExtractor._parse_eapol_key expects."""
    body = bytearray()
    body += bytes([0x02])                       # descriptor_type (RSN)
    body += struct.pack('>H', key_info)
    body += struct.pack('>H', 0)                # key_length
    body += replay_counter.ljust(8, b'\x00')[:8]
    body += nonce.ljust(32, b'\x00')[:32]
    body += b'\x00' * 16                        # key_iv
    body += b'\x00' * 8                         # key_rsc
    body += b'\x00' * 8                         # key_id
    body += key_mic.ljust(16, b'\x00')[:16]
    body += struct.pack('>H', len(key_data))
    body += key_data

    eapol = EAPOL(version=2, type=3, len=len(body)) / bytes(body)
    dot11 = Dot11(type=2, subtype=0, addr1=addr1, addr2=addr2, addr3=addr3, FCfield=0x01)
    return RadioTap() / dot11 / b'\xaa\xaa\x03\x00\x00\x00\x88\x8e' / bytes(eapol)


def build_single_ap_handshake():
    """One AP + one client + a full matched M1/M2 EAPOL handshake."""
    pkts = [_beacon(AP_MAC, 'HomeNet')]

    replay = (1).to_bytes(8, 'big')
    anonce = b'\x11' * 32
    mic = b'\x22' * 16

    # M1: AP -> STA, ack set, mic/install clear
    pkts.append(_eapol_key_frame(
        addr1=STA_MAC, addr2=AP_MAC, addr3=AP_MAC,
        key_info=0x008A,  # pairwise(0x08) + ack(0x80) + key_descr_version bits
        replay_counter=replay, nonce=anonce, key_mic=b'\x00' * 16,
    ))
    # M2: STA -> AP, mic set, ack/install clear
    pkts.append(_eapol_key_frame(
        addr1=AP_MAC, addr2=STA_MAC, addr3=AP_MAC,
        key_info=0x0108,  # pairwise(0x08) + mic(0x100)
        replay_counter=replay, nonce=b'\x00' * 32, key_mic=mic,
    ))

    wrpcap(os.path.join(OUT_DIR, 'single_ap_handshake.pcap'), pkts)


def build_pmkid():
    """AP beacon + a lone EAPOL M1 carrying a PMKID KDE."""
    pkts = [_beacon(AP_MAC, 'PmkidNet')]

    pmkid = b'\x33' * 16
    # PMKID KDE: 0xDD len OUI(00:0f:ac) type(04) PMKID(16 bytes) — len covers
    # everything after the tag+len bytes, i.e. 4 (OUI+type) + 16 (PMKID) = 20
    kde = bytes([0xDD, 20]) + b'\x00\x0f\xac\x04' + pmkid

    pkts.append(_eapol_key_frame(
        addr1=STA_MAC, addr2=AP_MAC, addr3=AP_MAC,
        key_info=0x008A,
        replay_counter=(1).to_bytes(8, 'big'), nonce=b'\x44' * 32, key_mic=b'\x00' * 16,
        key_data=kde,
    ))

    wrpcap(os.path.join(OUT_DIR, 'pmkid.pcap'), pkts)


def build_evil_twin():
    """Two beacons, same SSID, different BSSIDs."""
    pkts = [_beacon(AP_MAC, 'EvilNet'), _beacon(AP2_MAC, 'EvilNet')]
    wrpcap(os.path.join(OUT_DIR, 'evil_twin.pcap'), pkts)


def build_deauth_flood():
    """One client on the receiving end of >20 deauth frames."""
    pkts = [_beacon(AP_MAC, 'FloodTestNet')]
    for _ in range(25):
        pkts.append(
            RadioTap()
            / Dot11(type=0, subtype=12, addr1=STA_MAC, addr2=AP_MAC, addr3=AP_MAC)
            / Dot11Deauth(reason=7)
        )
    wrpcap(os.path.join(OUT_DIR, 'deauth_flood.pcap'), pkts)


def build_probe_requests():
    """A couple of probe requests with distinct probed SSIDs."""
    pkts = [
        RadioTap()
        / Dot11(type=0, subtype=4, addr1='ff:ff:ff:ff:ff:ff', addr2=STA_MAC, addr3='ff:ff:ff:ff:ff:ff')
        / Dot11ProbeReq()
        / Dot11Elt(ID=0, info=b'hikvision-cam'),
        RadioTap()
        / Dot11(type=0, subtype=4, addr1='ff:ff:ff:ff:ff:ff', addr2=STA_MAC, addr3='ff:ff:ff:ff:ff:ff')
        / Dot11ProbeReq()
        / Dot11Elt(ID=0, info=b'HomeNet'),
    ]
    wrpcap(os.path.join(OUT_DIR, 'probe_requests.pcap'), pkts)


if __name__ == '__main__':
    os.makedirs(OUT_DIR, exist_ok=True)
    build_single_ap_handshake()
    build_pmkid()
    build_evil_twin()
    build_deauth_flood()
    build_probe_requests()
    print(f'Fixtures written to {OUT_DIR}')
