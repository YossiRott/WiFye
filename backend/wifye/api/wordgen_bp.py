import os

from flask import Blueprint, current_app, jsonify, request

from ..wordgen.wordlist_generator import WordlistGenerator

wordgen_bp = Blueprint('wordgen', __name__)


@wordgen_bp.route('/api/wordgen', methods=['POST'])
def wordgen():
    services = current_app.extensions['wifye']
    data = request.json or {}
    seeds = data.get('seeds', [])
    options = data.get('options', {})
    full = bool(data.get('full', False))

    words = WordlistGenerator.generate(seeds, options)
    if not words:
        return jsonify({'error': 'No words generated — add at least one seed word'}), 400

    out_path = services.dict_store.path_for('wifye_wordgen.txt')
    with open(out_path, 'w') as f:
        f.write('\n'.join(words) + '\n')
    services.dict_store.set_saved_wordlist(out_path)

    preview = words[:30]
    resp = {'count': len(words), 'preview': preview, 'path': out_path}
    if full:
        resp['words'] = words
    return jsonify(resp)


@wordgen_bp.route('/api/wordgen/path', methods=['GET'])
def wordgen_path():
    services = current_app.extensions['wifye']
    path = services.dict_store.get_saved_wordlist()
    if path and os.path.exists(path):
        return jsonify({'path': path, 'exists': True})
    return jsonify({'path': None, 'exists': False})
