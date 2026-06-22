import re


def parse_stats(lines):
    """Extract structured stats from accumulated hashcat --status output lines."""
    stats = {}
    for line in reversed(lines):
        if 'speed' not in stats:
            m = re.search(r'Speed\.#\S+\s*:\s*([\d,.]+ \S?H/s)', line)
            if m:
                stats['speed'] = m.group(1).strip()
        if 'progress' not in stats:
            m = re.search(r'Progress[^:]*:\s*(\d+)/(\d+)\s+\(([\d.]+)%\)', line)
            if m:
                stats['progress'] = float(m.group(3))
                stats['tried'] = int(m.group(1))
                stats['total_ksp'] = int(m.group(2))
        if 'recovered' not in stats:
            m = re.search(r'Recovered[^:]*:\s*(\d+)/(\d+)', line)
            if m:
                stats['recovered'] = int(m.group(1))
        if 'status_text' not in stats:
            m = re.search(r'^Status\.*:\s*(\w+)', line.strip())
            if m:
                stats['status_text'] = m.group(1)
        if 'elapsed' not in stats:
            m = re.search(r'Time\.Started.*?,\s*\((.+?)\)', line)
            if m:
                stats['elapsed'] = m.group(1).strip()
    return stats


def decode_cracked(line):
    """
    Decode a hashcat potfile/output line to {ssid, password}.
    Format: WPA*01*PMKID*AP_MAC*STA_MAC*SSID_HEX*...:password
    """
    colon = line.rfind(':')
    if colon == -1:
        return {'ssid': 'Unknown', 'password': line}
    password = line[colon + 1:]
    fields = line[:colon].split('*')
    ssid = ''
    if len(fields) >= 6:
        try:
            ssid = bytes.fromhex(fields[5]).decode('utf-8', errors='replace')
        except Exception:
            ssid = fields[5]
    return {'ssid': ssid or 'Unknown', 'password': password}
