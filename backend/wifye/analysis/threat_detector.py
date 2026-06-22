class EvilTwinDetector:
    """Detects evil-twin APs: the same SSID broadcast from multiple BSSIDs."""

    @staticmethod
    def detect(networks):
        ssid_bssids = {}
        for net in networks:
            if net['ssid'] != '<hidden>':
                ssid_bssids.setdefault(net['ssid'], []).append(net['bssid'])
        return [
            {'ssid': ssid, 'bssids': bssids}
            for ssid, bssids in ssid_bssids.items() if len(bssids) > 1
        ]


class DeauthFloodDetector:
    """Detects clients on the receiving end of an abnormal volume of deauth/disassoc frames."""

    def __init__(self, threshold=20):
        self._threshold = threshold

    def detect(self, deauth_counts, vendor_lookup):
        return [
            {'src_mac': mac, 'vendor': vendor_lookup(mac), 'count': count}
            for mac, count in sorted(deauth_counts.items(), key=lambda item: -item[1])
            if count >= self._threshold
        ]
