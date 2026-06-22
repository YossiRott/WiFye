def test_wordgen_requires_at_least_one_seed(client):
    r = client.post('/api/wordgen', json={'seeds': [], 'options': {}})
    assert r.status_code == 400
    assert 'error' in r.json


def test_wordgen_returns_count_and_preview(client):
    r = client.post('/api/wordgen', json={'seeds': ['dog'], 'options': {'numbers': True}})
    assert r.status_code == 200
    body = r.json
    assert body['count'] > 0
    assert 'dog123' in body['preview'] or body['count'] <= 30
    assert 'words' not in body  # full=False by default


def test_wordgen_full_flag_includes_all_words(client):
    r = client.post('/api/wordgen', json={'seeds': ['dog'], 'options': {'numbers': True}, 'full': True})
    assert r.status_code == 200
    assert 'words' in r.json
    assert len(r.json['words']) == r.json['count']


def test_wordgen_path_reflects_last_generated_wordlist(client):
    client.post('/api/wordgen', json={'seeds': ['dog'], 'options': {}})
    r = client.get('/api/wordgen/path')
    assert r.status_code == 200
    assert r.json['exists'] is True
    assert r.json['path'].endswith('wifye_wordgen.txt')


def test_wordgen_path_when_nothing_generated_yet(client):
    r = client.get('/api/wordgen/path')
    assert r.json == {'path': None, 'exists': False}
