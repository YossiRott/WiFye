import os
import tempfile

from flask import Blueprint, current_app, jsonify, request

analyze_bp = Blueprint('analyze', __name__)


@analyze_bp.route('/api/analyze', methods=['POST'])
def analyze():
    services = current_app.extensions['wifye']

    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    f = request.files['file']
    if not f.filename:
        return jsonify({'error': 'No file selected'}), 400

    ext = os.path.splitext(f.filename.lower())[1]
    if ext not in current_app.config['ALLOWED_EXTENSIONS']:
        return jsonify({'error': 'Unsupported file type. Use .pcap, .pcapng or .cap'}), 400

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
    try:
        f.save(tmp.name)
        tmp.close()
        result = services.analyzer.analyze(tmp.name)
        result['hashes'] = services.extractor.extract(tmp.name)
        if result.get('summary'):
            result['summary']['total_handshakes'] = len(result['hashes'])
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        try:
            os.unlink(tmp.name)
        except OSError:
            pass
