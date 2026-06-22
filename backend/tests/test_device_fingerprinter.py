from wifye.analysis.device_fingerprinter import DeviceFingerprinter


class FakeOui:
    """Minimal stand-in for the oui_db module, injectable for testing."""

    def __init__(self, vendor='Unknown', device_type='Unknown Device'):
        self._vendor = vendor
        self._device_type = device_type

    def get_vendor(self, mac):
        return self._vendor

    def get_device_type(self, mac):
        return self._device_type


def test_ssid_keyword_fingerprint_takes_priority():
    fp = DeviceFingerprinter(oui_lookup=FakeOui())
    vendor, dtype = fp.fingerprint_from_frame({}, probed_ssid='My-Hikvision-Cam')
    assert vendor == 'Hikvision'
    assert dtype == 'DVR/Camera'


def test_generic_dvr_keyword_has_no_vendor():
    fp = DeviceFingerprinter(oui_lookup=FakeOui())
    vendor, dtype = fp.fingerprint_from_frame({}, probed_ssid='home-nvr-system')
    assert vendor is None
    assert dtype == 'DVR/NVR'


def test_wps_without_ht_implies_iot():
    fp = DeviceFingerprinter(oui_lookup=FakeOui())
    vendor, dtype = fp.fingerprint_from_frame({'ht': 0, 'wps': 1})
    assert dtype == 'IoT Device'


def test_low_max_rate_without_ht_or_vht_implies_iot():
    fp = DeviceFingerprinter(oui_lookup=FakeOui())
    vendor, dtype = fp.fingerprint_from_frame({'ht': 0, 'vht': 0, 'rates': [1, 2, 11, 54]})
    assert dtype == 'IoT Device'


def test_ht_capable_frame_has_no_fingerprint_guess():
    fp = DeviceFingerprinter(oui_lookup=FakeOui())
    vendor, dtype = fp.fingerprint_from_frame({'ht': 1, 'rates': [1, 2, 11, 54]})
    assert (vendor, dtype) == (None, None)


def test_identify_prefers_known_oui_over_fingerprint():
    fp = DeviceFingerprinter(oui_lookup=FakeOui(vendor='Apple', device_type='Smartphone'))
    identity = fp.identify('AA:BB:CC:DD:EE:FF', frame={'ht': 0, 'wps': 1})
    assert identity.vendor == 'Apple'
    assert identity.device_type == 'Smartphone'


def test_identify_falls_back_to_fingerprint_when_oui_unknown():
    fp = DeviceFingerprinter(oui_lookup=FakeOui(vendor='Unknown', device_type='Unknown Device'))
    identity = fp.identify('AA:BB:CC:DD:EE:FF', frame={'ht': 0, 'wps': 1})
    assert identity.device_type == 'IoT Device'


def test_oui_identity_ignores_frame_heuristics():
    fp = DeviceFingerprinter(oui_lookup=FakeOui(vendor='TP-Link', device_type='Router'))
    identity = fp.oui_identity('AA:BB:CC:DD:EE:FF')
    assert identity.vendor == 'TP-Link'
    assert identity.device_type == 'Router'


def test_vendor_for_delegates_to_oui_lookup():
    fp = DeviceFingerprinter(oui_lookup=FakeOui(vendor='Netgear'))
    assert fp.vendor_for('AA:BB:CC:DD:EE:FF') == 'Netgear'
