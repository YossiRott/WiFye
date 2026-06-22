def test_crack_wordlists_returns_a_list(client):
    r = client.get('/api/crack/wordlists')
    assert r.status_code == 200
    assert isinstance(r.json, list)


def test_crack_start_requires_hashes(client):
    r = client.post('/api/crack/start', json={'hashes': [], 'wordlists': ['/tmp/wl.txt']})
    assert r.status_code == 400


def test_crack_start_requires_wordlists(client):
    r = client.post('/api/crack/start', json={'hashes': ['WPA*01*...'], 'wordlists': []})
    assert r.status_code == 400


def test_crack_status_when_idle(client):
    r = client.get('/api/crack/status')
    assert r.status_code == 200
    assert r.json['status'] == 'idle'


def test_crack_stop_and_clear_are_safe_when_idle(client):
    assert client.post('/api/crack/stop').status_code == 200
    assert client.post('/api/crack/clear').status_code == 200


def test_crack_start_rejects_concurrent_jobs_via_real_manager(app, client):
    services = app.extensions['wifye']

    class StubRunner:
        def build_command(self, hash_file, wordlist_paths, workload, pot_file):
            return ['hashcat']

        def run_async(self, job, cmd):
            pass  # leave job 'running' to simulate an in-flight job

    services.crack_manager._runner = StubRunner()

    first = client.post('/api/crack/start', json={'hashes': ['h1'], 'wordlists': ['/tmp/wl.txt']})
    assert first.status_code == 200

    second = client.post('/api/crack/start', json={'hashes': ['h2'], 'wordlists': ['/tmp/wl.txt']})
    assert second.status_code == 409
