from pathlib import Path

import pytest

from wifye import create_app
from wifye.config import Config


class TestConfig(Config):
    DEBUG = True
    TESTING = True


@pytest.fixture
def app():
    return create_app(TestConfig)


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def fixtures_dir():
    return Path(__file__).parent / 'fixtures' / 'pcaps'
