import os

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Config:
    STATIC_FOLDER = os.path.join(_BACKEND_DIR, '..', 'frontend', 'dist')
    ALLOWED_EXTENSIONS = {'.pcap', '.pcapng', '.cap'}
    DEBUG = False


class DevConfig(Config):
    DEBUG = True


class ProdConfig(Config):
    DEBUG = False
