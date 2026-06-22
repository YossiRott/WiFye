import io


def test_analyze_requires_a_file(client):
    r = client.post('/api/analyze', data={}, content_type='multipart/form-data')
    assert r.status_code == 400
    assert 'error' in r.json


def test_analyze_rejects_unsupported_extension(client):
    data = {'file': (io.BytesIO(b'not a pcap'), 'notes.txt')}
    r = client.post('/api/analyze', data=data, content_type='multipart/form-data')
    assert r.status_code == 400
    assert 'Unsupported file type' in r.json['error']


def test_analyze_accepts_a_real_pcap_fixture(client, fixtures_dir):
    pcap_path = fixtures_dir / 'evil_twin.pcap'
    with open(pcap_path, 'rb') as f:
        data = {'file': (f, 'evil_twin.pcap')}
        r = client.post('/api/analyze', data=data, content_type='multipart/form-data')

    assert r.status_code == 200
    body = r.json
    assert 'summary' in body
    assert 'hashes' in body
    assert body['summary']['total_handshakes'] == len(body['hashes'])
