from wifye.analysis.pcap_analyzer import PcapAnalyzer


class FakeFrameParser:
    """Stands in for FrameParser so PcapAnalyzer's aggregation logic can be
    unit-tested without depending on the compiled C binary."""

    def __init__(self, frames, total=None):
        self._frames = frames
        self._total = total if total is not None else len(frames)

    def parse(self, filepath, timeout=180):
        return {'frames': self._frames, 'total': self._total}


def test_builds_network_from_beacon_frame():
    frames = [
        {'type': 'beacon', 'ts': 1000, 'sig': -40, 'bssid': 'AA:BB:CC:DD:EE:01',
         'ssid': 'HomeNet', 'enc': 'WPA2', 'ch': 6},
    ]
    result = PcapAnalyzer(frame_parser=FakeFrameParser(frames)).analyze('ignored.pcap')

    assert result['summary']['total_aps'] == 1
    network = result['networks'][0]
    assert network['ssid'] == 'HomeNet'
    assert network['encryption'] == 'WPA2'
    assert network['channel'] == 6
    assert network['clients'] == []


def test_hidden_ssid_beacon_uses_placeholder():
    frames = [{'type': 'beacon', 'ts': 1000, 'sig': -40, 'bssid': 'AA:BB:CC:DD:EE:01', 'ssid': '', 'ch': 1}]
    result = PcapAnalyzer(frame_parser=FakeFrameParser(frames)).analyze('ignored.pcap')
    assert result['networks'][0]['ssid'] == '<hidden>'


def test_assoc_req_links_client_to_ap():
    frames = [
        {'type': 'beacon', 'ts': 1, 'bssid': 'AA:BB:CC:DD:EE:01', 'ssid': 'HomeNet', 'ch': 1},
        {'type': 'assoc_req', 'ts': 2, 'bssid': 'AA:BB:CC:DD:EE:01', 'client': '02:22:33:44:55:66'},
    ]
    result = PcapAnalyzer(frame_parser=FakeFrameParser(frames)).analyze('ignored.pcap')

    network = result['networks'][0]
    assert len(network['clients']) == 1
    assert network['clients'][0]['mac'] == '02:22:33:44:55:66'
    assert result['summary']['total_clients'] == 1


def test_evil_twin_flagged_across_two_bssids():
    frames = [
        {'type': 'beacon', 'ts': 1, 'bssid': 'AA:AA:AA:AA:AA:01', 'ssid': 'EvilNet', 'ch': 6},
        {'type': 'beacon', 'ts': 1, 'bssid': 'AA:AA:AA:AA:AA:02', 'ssid': 'EvilNet', 'ch': 6},
    ]
    result = PcapAnalyzer(frame_parser=FakeFrameParser(frames)).analyze('ignored.pcap')

    assert len(result['evil_twins']) == 1
    assert all(net['is_evil_twin'] for net in result['networks'])


def test_deauth_flood_detected_above_threshold():
    frames = [{'type': 'beacon', 'ts': 1, 'bssid': 'AA:BB:CC:DD:EE:01', 'ssid': 'Net', 'ch': 1}]
    frames += [{'type': 'deauth', 'ts': 1, 'client': '02:22:33:44:55:66'}] * 25

    result = PcapAnalyzer(frame_parser=FakeFrameParser(frames)).analyze('ignored.pcap')

    assert len(result['deauth_floods']) == 1
    assert result['deauth_floods'][0]['count'] == 25


def test_deauth_below_threshold_is_not_flagged():
    frames = [{'type': 'deauth', 'ts': 1, 'client': '02:22:33:44:55:66'}] * 5
    result = PcapAnalyzer(frame_parser=FakeFrameParser(frames)).analyze('ignored.pcap')
    assert result['deauth_floods'] == []


def test_probe_request_aggregated_by_client():
    frames = [
        {'type': 'probe_req', 'ts': 1, 'client': '02:22:33:44:55:66', 'ssid': 'NetA'},
        {'type': 'probe_req', 'ts': 2, 'client': '02:22:33:44:55:66', 'ssid': 'NetB'},
    ]
    result = PcapAnalyzer(frame_parser=FakeFrameParser(frames)).analyze('ignored.pcap')

    assert len(result['probes']) == 1
    assert result['probes'][0]['probed_ssids'] == ['NetA', 'NetB']


def test_broadcast_client_mac_is_ignored():
    frames = [{'type': 'assoc_req', 'ts': 1, 'bssid': 'AA:BB:CC:DD:EE:01', 'client': 'FF:FF:FF:FF:FF:FF'}]
    result = PcapAnalyzer(frame_parser=FakeFrameParser(frames)).analyze('ignored.pcap')
    assert result['summary']['total_clients'] == 0


def test_channel_usage_counts_aps_per_channel():
    frames = [
        {'type': 'beacon', 'ts': 1, 'bssid': 'AA:BB:CC:DD:EE:01', 'ssid': 'A', 'ch': 6},
        {'type': 'beacon', 'ts': 1, 'bssid': 'AA:BB:CC:DD:EE:02', 'ssid': 'B', 'ch': 6},
        {'type': 'beacon', 'ts': 1, 'bssid': 'AA:BB:CC:DD:EE:03', 'ssid': 'C', 'ch': 11},
    ]
    result = PcapAnalyzer(frame_parser=FakeFrameParser(frames)).analyze('ignored.pcap')
    assert result['channel_usage'] == {'6': 2, '11': 1}


def test_scan_duration_computed_from_timestamp_spread():
    frames = [
        {'type': 'beacon', 'ts': 1000, 'bssid': 'AA:BB:CC:DD:EE:01', 'ssid': 'A', 'ch': 1},
        {'type': 'beacon', 'ts': 1090, 'bssid': 'AA:BB:CC:DD:EE:01', 'ssid': 'A', 'ch': 1},
    ]
    result = PcapAnalyzer(frame_parser=FakeFrameParser(frames)).analyze('ignored.pcap')
    assert result['summary']['scan_duration'] == '00:01:30'


def test_parser_error_is_translated_to_error_response():
    from wifye.analysis.frame_parser import ParserTimeoutError

    class FailingParser:
        def parse(self, filepath, timeout=180):
            raise ParserTimeoutError('Parsing timed out (file too large?)')

    result = PcapAnalyzer(frame_parser=FailingParser()).analyze('ignored.pcap')
    assert result['error'] == 'Parsing timed out (file too large?)'
    assert result['networks'] == []
    assert result['summary'] == {}
