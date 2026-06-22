from types import SimpleNamespace

from flask import Flask
from flask_cors import CORS

from .analysis.device_fingerprinter import DeviceFingerprinter
from .analysis.frame_parser import FrameParser
from .analysis.handshake_extractor import HandshakeExtractor
from .analysis.pcap_analyzer import PcapAnalyzer
from .analysis.threat_detector import DeauthFloodDetector, EvilTwinDetector
from .api.analyze_bp import analyze_bp
from .api.crack_bp import crack_bp
from .api.frontend_bp import frontend_bp
from .api.wordgen_bp import wordgen_bp
from .config import ProdConfig
from .cracking.crack_job_manager import CrackJobManager
from .cracking.dictionary_store import DictionaryStore
from .cracking.wordlist_finder import WordlistFinder


def create_app(config_class=ProdConfig):
    app = Flask(__name__, static_folder=config_class.STATIC_FOLDER)
    app.config.from_object(config_class)
    CORS(app)

    dictionary_store = DictionaryStore()
    app.extensions['wifye'] = SimpleNamespace(
        analyzer=PcapAnalyzer(
            frame_parser=FrameParser(),
            fingerprinter=DeviceFingerprinter(),
            evil_twin_detector=EvilTwinDetector(),
            deauth_detector=DeauthFloodDetector(),
        ),
        extractor=HandshakeExtractor(),
        dict_store=dictionary_store,
        crack_manager=CrackJobManager(dictionary_store),
        wordlist_finder=WordlistFinder(),
    )

    app.register_blueprint(frontend_bp)
    app.register_blueprint(analyze_bp)
    app.register_blueprint(crack_bp)
    app.register_blueprint(wordgen_bp)

    return app
