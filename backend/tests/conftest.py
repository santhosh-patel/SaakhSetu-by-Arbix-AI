import os
import pathlib

import pytest

# Force test database BEFORE any app imports
_TEST_DB = "test_saakhsetu.db"
os.environ["SAAKHSETU_DB_PATH"] = _TEST_DB

# Reload database module to pick up the env var
import app.database as _db_mod  # noqa: E402

_db_mod.DB_PATH = _TEST_DB

from app.database import init_db  # noqa: E402
from app.main import app  # noqa: E402

from fastapi.testclient import TestClient  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _setup_test_db():
    """Create test database before the session and remove it afterwards."""
    init_db()
    yield
    db_file = pathlib.Path(_TEST_DB)
    if db_file.exists():
        db_file.unlink()
    journal = pathlib.Path(f"{_TEST_DB}-journal")
    if journal.exists():
        journal.unlink()


@pytest.fixture
def client():
    return TestClient(app)
