from wifye.analysis.handshake_extractor import HandshakeExtractor


def test_full_eapol_handshake_extraction(fixtures_dir):
    hashes = HandshakeExtractor().extract(str(fixtures_dir / 'single_ap_handshake.pcap'))

    assert len(hashes) == 1
    h = hashes[0]
    assert h['ssid'] == 'HomeNet'
    assert h['bssid'] == '02:11:22:33:44:55'
    assert h['client_mac'] == '02:AA:BB:CC:DD:EE'
    assert h['hash_type'] == 'EAPOL'
    assert h['has_full_handshake'] is True
    assert h['hash_22000'].startswith('WPA*02*')


def test_pmkid_extraction(fixtures_dir):
    hashes = HandshakeExtractor().extract(str(fixtures_dir / 'pmkid.pcap'))

    assert len(hashes) == 1
    h = hashes[0]
    assert h['ssid'] == 'PmkidNet'
    assert h['hash_type'] == 'PMKID'
    assert h['has_full_handshake'] is True
    assert h['hash_22000'].startswith('WPA*01*')


def test_pcap_without_eapol_frames_yields_no_hashes(fixtures_dir):
    hashes = HandshakeExtractor().extract(str(fixtures_dir / 'evil_twin.pcap'))
    assert hashes == []


def test_nonexistent_file_returns_empty_list():
    assert HandshakeExtractor().extract('/no/such/file.pcap') == []
