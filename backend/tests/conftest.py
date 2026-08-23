import sys
import os
from pathlib import Path

# Add backend directory to python path
backend_path = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_path))

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db import Base, engine, SessionLocal

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def client():
    return TestClient(app)
