import os

import pytest

from wifye.analysis.frame_parser import FrameParser
from wifye.analysis.pcap_analyzer import PcapAnalyzer

pytestmark = pytest.mark.skipif(
    not os.path.exists(FrameParser().binary_path),
    reason='compiled parser binary not found — run gcc -O2 -o parser parser.c first',
)


def test_evil_twin_pcap_via_real_parser_binary(fixtures_dir):
    result = PcapAnalyzer().analyze(str(fixtures_dir / 'evil_twin.pcap'))
    assert result.get('error') is None
    assert len(result['evil_twins']) == 1
    assert result['evil_twins'][0]['ssid'] == 'EvilNet'


def test_deauth_flood_pcap_via_real_parser_binary(fixtures_dir):
    result = PcapAnalyzer().analyze(str(fixtures_dir / 'deauth_flood.pcap'))
    assert result.get('error') is None
    assert len(result['deauth_floods']) == 1
    assert result['deauth_floods'][0]['count'] == 25


def test_probe_requests_pcap_via_real_parser_binary(fixtures_dir):
    result = PcapAnalyzer().analyze(str(fixtures_dir / 'probe_requests.pcap'))
    assert result.get('error') is None
    assert len(result['probes']) == 1
    assert set(result['probes'][0]['probed_ssids']) == {'HomeNet', 'hikvision-cam'}
    assert result['probes'][0]['device_type'] == 'DVR/Camera'
