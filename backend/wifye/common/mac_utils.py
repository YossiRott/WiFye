class MacAddress:
    """A normalized 802.11 MAC address. Construct via MacAddress.parse()."""

    __slots__ = ('_hex',)

    def __init__(self, hex_str):
        self._hex = hex_str

    @classmethod
    def parse(cls, raw):
        if not raw:
            return None
        hex_str = raw.lower().replace(':', '').replace('-', '')
        if len(hex_str) != 12 or any(c not in '0123456789abcdef' for c in hex_str):
            return None
        return cls(hex_str)

    @property
    def hex(self):
        return self._hex

    @property
    def display(self):
        return ':'.join(self._hex[i:i + 2] for i in range(0, 12, 2)).upper()

    @property
    def is_broadcast(self):
        return self._hex == 'ffffffffffff'

    @property
    def is_null(self):
        return self._hex == '000000000000'

    @property
    def is_multicast(self):
        return bool(int(self._hex[0:2], 16) & 0x01)

    @property
    def is_valid(self):
        return not (self.is_broadcast or self.is_null or self.is_multicast)

    def __eq__(self, other):
        return isinstance(other, MacAddress) and self._hex == other._hex

    def __hash__(self):
        return hash(self._hex)

    def __str__(self):
        return self.display

    def __repr__(self):
        return f"MacAddress('{self.display}')"


def normalize_mac(raw):
    """Uppercase a colon-formatted MAC without otherwise validating it."""
    return raw.upper() if raw else None


def is_valid_mac(raw):
    mac = MacAddress.parse(raw)
    return mac is not None and mac.is_valid


def mac_to_hex(raw):
    """Lowercase 12-hex-digit form, e.g. for hashcat 22000 hash lines."""
    mac = MacAddress.parse(raw)
    return mac.hex if mac else '000000000000'


def mac_to_display(raw):
    """Uppercase colon-separated form, accepting either colon or bare-hex input."""
    mac = MacAddress.parse(raw)
    return mac.display if mac else (raw.upper() if raw else '')
