from wifye.cracking.crack_job_manager import CrackJobManager
from wifye.cracking.dictionary_store import DictionaryStore


class FakeRunner:
    """Stands in for HashcatRunner — never spawns a real subprocess."""

    def __init__(self):
        self.started_jobs = []

    def build_command(self, hash_file, wordlist_paths, workload, pot_file):
        return ['hashcat', '-m', '22000', hash_file, *wordlist_paths, '-w', workload]

    def run_async(self, job, cmd):
        # Simulate immediate synchronous completion instead of a background thread.
        self.started_jobs.append(job)
        job.mark_done('done')


def make_manager(tmp_path):
    store = DictionaryStore(base_dir=str(tmp_path), cleanup_on_exit=False)
    runner = FakeRunner()
    return CrackJobManager(store, runner=runner), runner


def test_status_when_idle(tmp_path):
    manager, _ = make_manager(tmp_path)
    assert manager.status() == {
        'status': 'idle', 'output': [], 'total': 0, 'done': True, 'cracked': [], 'stats': {},
    }


def test_start_creates_job_and_runs_it(tmp_path):
    manager, runner = make_manager(tmp_path)
    result = manager.start(['WPA*01*...'], ['/tmp/wordlist.txt'], workload='2')

    assert result['started'] is True
    assert 'hashcat' in result['cmd']
    assert len(runner.started_jobs) == 1

    status = manager.status()
    assert status['status'] == 'done'
    assert status['done'] is True


def test_start_rejects_concurrent_jobs(tmp_path):
    store = DictionaryStore(base_dir=str(tmp_path), cleanup_on_exit=False)

    class NeverCompletingRunner(FakeRunner):
        def run_async(self, job, cmd):
            self.started_jobs.append(job)  # leave status as 'running'

    manager = CrackJobManager(store, runner=NeverCompletingRunner())
    first = manager.start(['hash1'], ['/tmp/wl.txt'])
    assert 'error' not in first

    second = manager.start(['hash2'], ['/tmp/wl.txt'])
    assert 'error' in second


def test_clear_resets_job_to_idle(tmp_path):
    manager, _ = make_manager(tmp_path)
    manager.start(['hash1'], ['/tmp/wl.txt'])
    manager.clear()
    assert manager.status()['status'] == 'idle'


def test_stop_marks_job_stopped_when_proc_present(tmp_path):
    store = DictionaryStore(base_dir=str(tmp_path), cleanup_on_exit=False)

    class FakeProc:
        def __init__(self):
            self.terminated = False

        def terminate(self):
            self.terminated = True

    class RunningRunner(FakeRunner):
        def run_async(self, job, cmd):
            job.proc = FakeProc()
            self.started_jobs.append(job)

    manager = CrackJobManager(store, runner=RunningRunner())
    manager.start(['hash1'], ['/tmp/wl.txt'])
    result = manager.stop()

    assert result == {'stopped': True}
    assert manager.status()['status'] == 'stopped'
