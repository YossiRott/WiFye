from flask import Blueprint, current_app, send_from_directory

frontend_bp = Blueprint('frontend', __name__)


@frontend_bp.route('/')
def index():
    return send_from_directory(current_app.static_folder, 'index.html')


@frontend_bp.route('/<path:path>')
def static_files(path):
    return send_from_directory(current_app.static_folder, path)
