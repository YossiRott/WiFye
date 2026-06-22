import tempfile
import threading

from .crack_job import CrackJob
from .hashcat_runner import HashcatRunner


class CrackJobManager:
    """Owns the single active hashcat crack job, replacing module-level globals
    (_job/_job_lock) with per-app instance state."""

    def __init__(self, dictionary_store, runner=None):
        self._dict_store = dictionary_store
        self._runner = runner or HashcatRunner()
        self._job = None
        self._lock = threading.Lock()

    def start(self, hash_lines, wordlist_paths, workload='3'):
        with self._lock:
            if self._job and self._job.status == 'running':
                return {'error': 'A crack job is already running — stop it first.'}

        hash_file = tempfile.NamedTemporaryFile(
            suffix='.22000', delete=False, mode='w', prefix='wifye_hash_', dir=self._dict_store.dir,
        )
        hash_file.write('\n'.join(hash_lines) + '\n')
        hash_file.close()

        pot_file = tempfile.NamedTemporaryFile(
            suffix='.pot', delete=False, prefix='wifye_pot_', dir=self._dict_store.dir,
        )
        pot_file.close()

        cmd = self._runner.build_command(hash_file.name, wordlist_paths, workload, pot_file.name)
        job = CrackJob(hash_file=hash_file.name, pot_file=pot_file.name, cmd=' '.join(cmd))

        with self._lock:
            self._job = job

        self._runner.run_async(job, cmd)
        return {'started': True, 'cmd': job.cmd}

    def status(self, from_line=0):
        with self._lock:
            job = self._job
        return job.to_status_dict(from_line) if job else CrackJob.idle_status()

    def stop(self):
        with self._lock:
            job = self._job
        if job and job.proc:
            try:
                job.proc.terminate()
            except Exception:
                pass
            job.mark_done('stopped')
        return {'stopped': True}

    def clear(self):
        with self._lock:
            self._job = None
        return {'cleared': True}
