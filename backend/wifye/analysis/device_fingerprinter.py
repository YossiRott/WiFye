from dataclasses import dataclass

from ..devices import oui_db

_SSID_FINGERPRINTS = [
    (['hikvision'],                   ('Hikvision',        'DVR/Camera')),
    (['dahua'],                        ('Dahua Technology', 'DVR/Camera')),
    (['reolink'],                      ('Reolink',          'IP Camera')),
    (['ezviz'],                        ('EZVIZ',            'IP Camera')),
    (['amcrest'],                      ('Amcrest',          'IP Camera')),
    (['foscam'],                       ('Foscam',           'IP Camera')),
    (['uniview'],                      ('Uniview',          'DVR/Camera')),
    (['hanwha', 'wisenet'],            ('Hanwha',           'DVR/Camera')),
    (['vivotek'],                      ('Vivotek',          'IP Camera')),
    (['flir'],                         ('FLIR',             'IP Camera')),
    (['dvr', 'nvr', 'cctv', 'ipcam'], (None,               'DVR/NVR')),
]


@dataclass(frozen=True)
class DeviceIdentity:
    vendor: str
    device_type: str


class DeviceFingerprinter:
    """Identifies device vendor/type from OUI lookups and 802.11 frame heuristics."""

    def __init__(self, oui_lookup=oui_db):
        self._oui = oui_lookup

    def fingerprint_from_frame(self, frame, probed_ssid=''):
        """Guess device type from a parsed frame dict's SSID/IE fields, without using the MAC."""
        if probed_ssid:
            s = probed_ssid.lower()
            for keywords, result in _SSID_FINGERPRINTS:
                if any(kw in s for kw in keywords):
                    return result

        has_ht  = bool(frame.get('ht', 0))
        has_vht = bool(frame.get('vht', 0))
        rates   = frame.get('rates', [])
        max_rate = max(rates) if rates else 0
        has_wps = bool(frame.get('wps', 0))

        if not has_ht and has_wps:
            return (None, 'IoT Device')
        if not has_ht and not has_vht and 0 < max_rate <= 54:
            return (None, 'IoT Device')
        return (None, None)

    def identify(self, mac, frame=None, probed_ssid=''):
        """Combine an OUI lookup with frame-based heuristics; OUI wins unless it's unknown."""
        oui_vendor = self._oui.get_vendor(mac)
        oui_dtype = self._oui.get_device_type(mac)
        fp_vendor, fp_dtype = self.fingerprint_from_frame(frame or {}, probed_ssid)
        vendor = oui_vendor if oui_vendor != 'Unknown' else (fp_vendor or 'Unknown')
        dtype = oui_dtype if oui_dtype != 'Unknown Device' else (fp_dtype or 'Unknown Device')
        return DeviceIdentity(vendor, dtype)

    def oui_identity(self, mac):
        return DeviceIdentity(self._oui.get_vendor(mac), self._oui.get_device_type(mac))

    def vendor_for(self, mac):
        return self._oui.get_vendor(mac)
