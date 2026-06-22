import os

from flask import Blueprint, current_app, jsonify, request

crack_bp = Blueprint('crack', __name__)


@crack_bp.route('/api/crack/wordlists', methods=['GET'])
def crack_wordlists():
    services = current_app.extensions['wifye']
    return jsonify(services.wordlist_finder.find_system_wordlists())


@crack_bp.route('/api/crack/upload-dict', methods=['POST'])
def crack_upload_dict():
    services = current_app.extensions['wifye']
    if 'file' not in request.files:
        return jsonify({'error': 'No file'}), 400
    f = request.files['file']
    if not f.filename:
        return jsonify({'error': 'Empty filename'}), 400
    path = services.dict_store.save_upload(f)
    size = os.path.getsize(path)
    return jsonify({'path': path, 'name': f.filename, 'size': size})


@crack_bp.route('/api/crack/start', methods=['POST'])
def crack_start():
    services = current_app.extensions['wifye']
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

    result = services.crack_manager.start(hashes, wordlists, workload)
    if 'error' in result:
        return jsonify(result), 409
    return jsonify(result)


@crack_bp.route('/api/crack/status', methods=['GET'])
def crack_status():
    services = current_app.extensions['wifye']
    from_line = int(request.args.get('from', 0))
    return jsonify(services.crack_manager.status(from_line))


@crack_bp.route('/api/crack/stop', methods=['POST'])
def crack_stop():
    services = current_app.extensions['wifye']
    return jsonify(services.crack_manager.stop())


@crack_bp.route('/api/crack/clear', methods=['POST'])
def crack_clear():
    services = current_app.extensions['wifye']
    return jsonify(services.crack_manager.clear())
