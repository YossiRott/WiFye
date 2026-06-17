import os
import re
import shutil
import subprocess
import tempfile
import threading
import atexit
from pathlib import Path

WORDLIST_DIRS = [
    '/usr/share/wordlists',
    '/usr/local/share/wordlists',
    '/opt/wordlists',
    '/home/kali/wordlists',
]

# Common locations where rockyou.txt may be installed
ROCKYOU_PATHS = [
    '/usr/share/wordlists/rockyou.txt',
    '/usr/local/share/wordlists/rockyou.txt',
    '/opt/homebrew/share/wordlists/rockyou.txt',
    '/opt/wordlists/rockyou.txt',
    os.path.expanduser('~/rockyou.txt'),
    '/usr/share/wordlists/rockyou.txt.gz',
]

_DICT_DIR = tempfile.mkdtemp(prefix='wifye_dicts_')
atexit.register(shutil.rmtree, _DICT_DIR, ignore_errors=True)

_job      = None
_job_lock = threading.Lock()
_saved_wordlist = None


def fmt_size(n):
    for unit in ('B', 'KB', 'MB', 'GB'):
        if n < 1024:
            return f'{n:.0f} {unit}'
        n /= 1024
    return f'{n:.1f} TB'


def _find_rockyou():
    """Return rockyou dict entry if found, else None."""
    for p in ROCKYOU_PATHS:
        if os.path.exists(p):
            return {
                'path': p,
                'name': os.path.basename(p),
                'size': fmt_size(os.path.getsize(p)),
                'is_default': True,
            }
    return None


def find_system_wordlists():
    found = []
    seen_paths = set()

    # Scan standard wordlist dirs (skip rockyou — we handle it separately)
    for d in WORDLIST_DIRS:
        p = Path(d)
        if not p.exists():
            continue
        for f in sorted(p.rglob('*')):
            if not f.is_file():
                continue
            if f.suffix not in ('.txt', '.lst', '.dict', ''):
                continue
            if f.stat().st_size == 0:
                continue
            if 'rockyou' in f.name.lower():
                seen_paths.add(str(f))
                continue  # will be added last
            if str(f) in seen_paths:
                continue
            seen_paths.add(str(f))
            found.append({
                'path': str(f),
                'name': str(f.relative_to(p)),
                'size': fmt_size(f.stat().st_size),
                'is_default': False,
            })
            if len(found) >= 150:
                break

    # Always append rockyou last (it's the default fallback)
    rk = _find_rockyou()
    if rk:
        found.append(rk)
    return found


def save_upload(file_storage):
    dst = os.path.join(_DICT_DIR, file_storage.filename or 'custom.txt')
    file_storage.save(dst)
    return dst


def set_saved_wordlist(path):
    global _saved_wordlist
    _saved_wordlist = path


def get_saved_wordlist():
    return _saved_wordlist


# ── hashcat output parsing ────────────────────────────────────────
def _parse_hashcat_stats(lines):
    """Extract structured stats from accumulated hashcat output lines."""
    stats = {}
    for line in reversed(lines):
        if 'speed' not in stats:
            m = re.search(r'Speed\.#\S+\s*:\s*([\d,.]+ \S?H/s)', line)
            if m:
                stats['speed'] = m.group(1).strip()
        if 'progress' not in stats:
            m = re.search(r'Progress[^:]*:\s*(\d+)/(\d+)\s+\(([\d.]+)%\)', line)
            if m:
                stats['progress']  = float(m.group(3))
                stats['tried']     = int(m.group(1))
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


def _decode_cracked(line):
    """
    Decode a hashcat potfile/output line to {ssid, password}.
    Format: WPA*01*PMKID*AP_MAC*STA_MAC*SSID_HEX*...:password
    """
    colon = line.rfind(':')
    if colon == -1:
        return {'ssid': 'Unknown', 'password': line}
    password  = line[colon + 1:]
    hash_part = line[:colon]
    fields    = hash_part.split('*')
    ssid = ''
    if len(fields) >= 6:
        try:
            ssid = bytes.fromhex(fields[5]).decode('utf-8', errors='replace')
        except Exception:
            ssid = fields[5]
    return {'ssid': ssid or 'Unknown', 'password': password}


# ── job management ────────────────────────────────────────────────
def start_crack(hash_lines, wordlist_paths, workload='3'):
    global _job

    with _job_lock:
        if _job and _job.get('status') == 'running':
            return {'error': 'A crack job is already running — stop it first.'}

    hf = tempfile.NamedTemporaryFile(
        suffix='.22000', delete=False, mode='w', prefix='wifye_hash_', dir=_DICT_DIR
    )
    hf.write('\n'.join(hash_lines) + '\n')
    hf.close()

    pf = tempfile.NamedTemporaryFile(
        suffix='.pot', delete=False, prefix='wifye_pot_', dir=_DICT_DIR
    )
    pf.close()

    cmd = [
        'hashcat', '-m', '22000', hf.name,
        *wordlist_paths,
        '-w', str(workload),
        '-D', '1,2',
        '--potfile-path', pf.name,
        '--status', '--status-timer=4',
        '--force', '-O',
    ]

    job = {
        'status':    'running',
        'hash_file': hf.name,
        'pot_file':  pf.name,
        'output':    [],
        'cracked':   [],
        'done':      False,
        'cmd':       ' '.join(cmd),
        'stats':     {},
    }

    with _job_lock:
        _job = job

    def _run():
        try:
            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                stdin=subprocess.DEVNULL,
                text=True, bufsize=1,
            )
            job['proc'] = proc
            for raw in proc.stdout:
                line = raw.rstrip()
                if line:
                    job['output'].append(line)
                    # Update stats on the fly from status lines
                    parsed = _parse_hashcat_stats(job['output'][-20:])
                    if parsed:
                        job['stats'].update(parsed)
            proc.wait()
            job['returncode'] = proc.returncode

            # Final stats pass over full output
            job['stats'] = _parse_hashcat_stats(job['output'])

            # Read potfile for cracked passwords
            try:
                with open(pf.name) as f:
                    for ln in f:
                        ln = ln.strip()
                        if ln:
                            job['cracked'].append(_decode_cracked(ln))
            except Exception:
                pass

        except FileNotFoundError:
            job['output'].append('ERROR: hashcat not found in PATH')
        except Exception as exc:
            job['output'].append(f'ERROR: {exc}')
        finally:
            job['status'] = 'done'
            job['done']   = True
            for p in (hf.name, pf.name):
                try:
                    os.unlink(p)
                except Exception:
                    pass

    threading.Thread(target=_run, daemon=True).start()
    return {'started': True, 'cmd': job['cmd']}


def get_status(from_line=0):
    with _job_lock:
        j = _job
    if not j:
        return {'status': 'idle', 'output': [], 'total': 0,
                'done': True, 'cracked': [], 'stats': {}}
    out = list(j.get('output', []))
    return {
        'status':  j.get('status', 'idle'),
        'output':  out[from_line:],
        'total':   len(out),
        'done':    j.get('done', False),
        'cracked': list(j.get('cracked', [])),
        'stats':   dict(j.get('stats', {})),
    }


def stop_crack():
    with _job_lock:
        j = _job
    if j and j.get('proc'):
        try:
            j['proc'].terminate()
        except Exception:
            pass
        j['status'] = 'stopped'
        j['done']   = True
    return {'stopped': True}


def clear_job():
    global _job
    with _job_lock:
        _job = None
    return {'cleared': True}
