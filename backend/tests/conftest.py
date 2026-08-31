import os
import tempfile

os.environ["DATA_DIR"] = tempfile.mkdtemp(prefix="schildkroeten-test-")
os.environ["DISABLE_SCHEDULER"] = "1"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlmodel import SQLModel  # noqa: E402

from app.db import engine, init_db  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture()
def client():
    SQLModel.metadata.drop_all(engine)
    init_db()
    return TestClient(app)
