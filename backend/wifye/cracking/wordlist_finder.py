import os
from pathlib import Path

WORDLIST_DIRS = [
    '/usr/share/wordlists',
    '/usr/local/share/wordlists',
    '/opt/wordlists',
    '/home/kali/wordlists',
]

ROCKYOU_PATHS = [
    '/usr/share/wordlists/rockyou.txt',
    '/usr/local/share/wordlists/rockyou.txt',
    '/opt/homebrew/share/wordlists/rockyou.txt',
    '/opt/wordlists/rockyou.txt',
    os.path.expanduser('~/rockyou.txt'),
    '/usr/share/wordlists/rockyou.txt.gz',
]


def fmt_size(n):
    for unit in ('B', 'KB', 'MB', 'GB'):
        if n < 1024:
            return f'{n:.0f} {unit}'
        n /= 1024
    return f'{n:.1f} TB'


class WordlistFinder:
    """Discovers system-installed wordlists for hashcat cracking."""

    def __init__(self, search_dirs=None, rockyou_paths=None, max_results=150):
        self._search_dirs = WORDLIST_DIRS if search_dirs is None else search_dirs
        self._rockyou_paths = ROCKYOU_PATHS if rockyou_paths is None else rockyou_paths
        self._max_results = max_results

    def find_rockyou(self):
        for p in self._rockyou_paths:
            if os.path.exists(p):
                return {
                    'path': p, 'name': os.path.basename(p),
                    'size': fmt_size(os.path.getsize(p)), 'is_default': True,
                }
        return None

    def find_system_wordlists(self):
        found = []
        seen_paths = set()

        for d in self._search_dirs:
            base = Path(d)
            if not base.exists():
                continue
            for f in sorted(base.rglob('*')):
                if not f.is_file():
                    continue
                if f.suffix not in ('.txt', '.lst', '.dict', ''):
                    continue
                if f.stat().st_size == 0:
                    continue
                if 'rockyou' in f.name.lower():
                    seen_paths.add(str(f))
                    continue
                if str(f) in seen_paths:
                    continue
                seen_paths.add(str(f))
                found.append({
                    'path': str(f), 'name': str(f.relative_to(base)),
                    'size': fmt_size(f.stat().st_size), 'is_default': False,
                })
                if len(found) >= self._max_results:
                    break

        rockyou = self.find_rockyou()
        if rockyou:
            found.append(rockyou)
        return found
