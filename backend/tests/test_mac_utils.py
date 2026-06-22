from wifye.common.mac_utils import (
    MacAddress,
    is_valid_mac,
    mac_to_display,
    mac_to_hex,
    normalize_mac,
)


def test_parse_accepts_colon_and_dash_formats():
    assert MacAddress.parse('aa:bb:cc:dd:ee:ff').hex == 'aabbccddeeff'
    assert MacAddress.parse('AA-BB-CC-DD-EE-FF').hex == 'aabbccddeeff'


def test_parse_rejects_invalid_input():
    assert MacAddress.parse(None) is None
    assert MacAddress.parse('') is None
    assert MacAddress.parse('not-a-mac') is None
    assert MacAddress.parse('aa:bb:cc:dd:ee') is None  # too short


def test_display_roundtrip():
    mac = MacAddress.parse('aa:bb:cc:dd:ee:ff')
    assert mac.display == 'AA:BB:CC:DD:EE:FF'


def test_broadcast_and_null_are_invalid():
    assert MacAddress.parse('ff:ff:ff:ff:ff:ff').is_valid is False
    assert MacAddress.parse('00:00:00:00:00:00').is_valid is False


def test_multicast_bit_is_invalid():
    # 0x01 bit set on the first octet marks a multicast/group address
    assert MacAddress.parse('01:00:5e:00:00:01').is_valid is False
    assert MacAddress.parse('02:11:22:33:44:55').is_valid is True


def test_equality_and_hashing():
    a = MacAddress.parse('aa:bb:cc:dd:ee:ff')
    b = MacAddress.parse('AA:BB:CC:DD:EE:FF')
    assert a == b
    assert hash(a) == hash(b)
    assert len({a, b}) == 1


def test_normalize_mac_uppercases():
    assert normalize_mac('aa:bb:cc:dd:ee:ff') == 'AA:BB:CC:DD:EE:FF'
    assert normalize_mac(None) is None


def test_is_valid_mac_matches_legacy_semantics():
    assert is_valid_mac('AA:BB:CC:DD:EE:FF') is True
    assert is_valid_mac('FF:FF:FF:FF:FF:FF') is False
    assert is_valid_mac('00:00:00:00:00:00') is False
    assert is_valid_mac(None) is False


def test_mac_to_hex_and_display_helpers():
    assert mac_to_hex('AA:BB:CC:DD:EE:FF') == 'aabbccddeeff'
    assert mac_to_hex(None) == '000000000000'
    assert mac_to_display('aabbccddeeff') == 'AA:BB:CC:DD:EE:FF'
    assert mac_to_display(None) == ''
