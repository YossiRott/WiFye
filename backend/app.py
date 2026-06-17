import os
import tempfile
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__, static_folder='../frontend')
CORS(app)

ALLOWED_EXT = {'.pcap', '.pcapng', '.cap'}


@app.route('/')
def index():
    return send_from_directory('../frontend', 'index.html')


@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('../frontend', path)


# ── Analyze ────────────────────────────────────────────────────
@app.route('/api/analyze', methods=['POST'])
def analyze():
    from analyzer import analyze_pcap
    from hash_extractor import extract_hashes

    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    f = request.files['file']
    if not f.filename:
        return jsonify({'error': 'No file selected'}), 400

    ext = os.path.splitext(f.filename.lower())[1]
    if ext not in ALLOWED_EXT:
        return jsonify({'error': 'Unsupported file type. Use .pcap, .pcapng or .cap'}), 400

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
    try:
        f.save(tmp.name)
        tmp.close()
        result = analyze_pcap(tmp.name)
        result['hashes'] = extract_hashes(tmp.name)
        if result.get('summary'):
            result['summary']['total_handshakes'] = len(result['hashes'])
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        try:
            os.unlink(tmp.name)
        except Exception:
            pass


# ── Crack: system wordlists ─────────────────────────────────────
@app.route('/api/crack/wordlists', methods=['GET'])
def crack_wordlists():
    from cracker import find_system_wordlists
    return jsonify(find_system_wordlists())


# ── Crack: upload custom dictionary ────────────────────────────
@app.route('/api/crack/upload-dict', methods=['POST'])
def crack_upload_dict():
    from cracker import save_upload
    if 'file' not in request.files:
        return jsonify({'error': 'No file'}), 400
    f = request.files['file']
    if not f.filename:
        return jsonify({'error': 'Empty filename'}), 400
    path = save_upload(f)
    size = os.path.getsize(path)
    return jsonify({'path': path, 'name': f.filename, 'size': size})


# ── Crack: start ────────────────────────────────────────────────
@app.route('/api/crack/start', methods=['POST'])
def crack_start():
    from cracker import start_crack
    data = request.json or {}
    hashes = data.get('hashes', [])
    wordlists = data.get('wordlists', [])
    workload = str(data.get('workload', '3'))

    if not hashes:
        return jsonify({'error': 'No hashes provided'}), 400
    if not wordlists:
        return jsonify({'error': 'No wordlists selected'}), 400
    if workload not in ('1', '2', '3', '4'):
        workload = '3'

    result = start_crack(hashes, wordlists, workload)
    if 'error' in result:
        return jsonify(result), 409
    return jsonify(result)


# ── Crack: status (polling) ─────────────────────────────────────
@app.route('/api/crack/status', methods=['GET'])
def crack_status():
    from cracker import get_status
    from_line = int(request.args.get('from', 0))
    return jsonify(get_status(from_line))


# ── Crack: stop ────────────────────────────────────────────────
@app.route('/api/crack/stop', methods=['POST'])
def crack_stop():
    from cracker import stop_crack
    return jsonify(stop_crack())


# ── Crack: clear ───────────────────────────────────────────────
@app.route('/api/crack/clear', methods=['POST'])
def crack_clear():
    from cracker import clear_job
    return jsonify(clear_job())


# ── Wordlist generator ──────────────────────────────────────────
@app.route('/api/wordgen', methods=['POST'])
def wordgen():
    from wordgen import generate
    from cracker import set_saved_wordlist, _DICT_DIR

    data = request.json or {}
    seeds   = data.get('seeds', [])
    options = data.get('options', {})
    full    = bool(data.get('full', False))

    words = generate(seeds, options)
    if not words:
        return jsonify({'error': 'No words generated — add at least one seed word'}), 400

    # Save to file so it can be used directly for cracking
    out_path = os.path.join(_DICT_DIR, 'wifye_wordgen.txt')
    with open(out_path, 'w') as f:
        f.write('\n'.join(words) + '\n')
    set_saved_wordlist(out_path)

    preview = words[:30]
    resp = {'count': len(words), 'preview': preview, 'path': out_path}
    if full:
        resp['words'] = words   # include all words for client-side download
    return jsonify(resp)


# ── Wordlist: get saved path ───────────────────────────────────
@app.route('/api/wordgen/path', methods=['GET'])
def wordgen_path():
    from cracker import get_saved_wordlist
    path = get_saved_wordlist()
    if path and os.path.exists(path):
        return jsonify({'path': path, 'exists': True})
    return jsonify({'path': None, 'exists': False})


if __name__ == '__main__':
    debug = os.environ.get('FLASK_DEBUG', '0') == '1'
    app.run(debug=debug, port=8080, host='0.0.0.0')
