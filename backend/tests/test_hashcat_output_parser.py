from wifye.cracking.hashcat_output_parser import decode_cracked, parse_stats


def test_parse_stats_extracts_speed_progress_and_recovered():
    lines = [
        'Session..........: hashcat',
        'Status...........: Running',
        'Speed.#1.........:    1234.5 kH/s (1.23ms) @ Accel:256 Loops:1 Thr:64 Vec:1',
        'Recovered........: 0/1 (0.00%) Digests',
        'Progress.........: 4096000/16000000 (25.60%)',
        'Time.Started.....: Mon Jan 01 00:00:00 2024, (1 min, 30 secs)',
    ]
    stats = parse_stats(lines)
    assert stats['speed'] == '1234.5 kH/s'
    assert stats['progress'] == 25.60
    assert stats['tried'] == 4096000
    assert stats['total_ksp'] == 16000000
    assert stats['recovered'] == 0
    assert stats['status_text'] == 'Running'
    assert stats['elapsed'] == '1 min, 30 secs'


def test_parse_stats_handles_empty_input():
    assert parse_stats([]) == {}


def test_parse_stats_ignores_unrecognized_lines():
    assert parse_stats(['hello world', 'nothing useful here']) == {}


def test_decode_cracked_extracts_ssid_and_password():
    line = 'WPA*01*aabbccddeeff00112233445566778899*aabbccddeeff*112233445566*' + 'EvilNet'.encode().hex() + '***:supersecret'
    result = decode_cracked(line)
    assert result == {'ssid': 'EvilNet', 'password': 'supersecret'}


def test_decode_cracked_without_colon_returns_whole_line_as_password():
    result = decode_cracked('no-colon-here')
    assert result == {'ssid': 'Unknown', 'password': 'no-colon-here'}


def test_decode_cracked_with_malformed_ssid_hex_falls_back_to_raw_field():
    line = 'WPA*01*pmkid*apmac*stamac*not-hex***:pw'
    result = decode_cracked(line)
    assert result['password'] == 'pw'
    assert result['ssid'] == 'not-hex'
