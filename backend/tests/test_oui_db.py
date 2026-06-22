from wifye.devices import oui_db


def test_known_oui_returns_expected_vendor_and_type():
    vendor, dtype = oui_db.get_oui('34:ea:34:11:22:33')
    assert vendor == 'Hikvision'
    assert dtype == 'DVR/Camera'


def test_get_vendor_and_get_device_type_match_get_oui():
    assert oui_db.get_vendor('34:ea:34:11:22:33') == 'Hikvision'
    assert oui_db.get_device_type('34:ea:34:11:22:33') == 'DVR/Camera'


def test_unknown_oui_falls_back_gracefully():
    vendor, dtype = oui_db.get_oui('ff:ff:ff:00:00:00')
    assert vendor == 'Unknown'
    assert dtype == 'Unknown Device'


def test_lookup_is_case_insensitive():
    assert oui_db.get_vendor('34:EA:34:11:22:33') == oui_db.get_vendor('34:ea:34:11:22:33')
