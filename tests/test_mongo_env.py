import importlib.util
import os
import sys
from pathlib import Path


def _load_server_module(monkeypatch, env):
    for key in ["MONGO_URL", "MANGO_URL", "DB_NAME", "JWT_SECRET"]:
        monkeypatch.delenv(key, raising=False)
    for key, value in env.items():
        monkeypatch.setenv(key, value)

    server_path = Path(__file__).resolve().parents[1] / "backend" / "server.py"
    spec = importlib.util.spec_from_file_location("backend_server_under_test", server_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules.pop("backend_server_under_test", None)
    spec.loader.exec_module(module)
    return module


def test_accepts_mango_url_alias(monkeypatch):
    module = _load_server_module(
        monkeypatch,
        {
            "MONGO_URL": "",
            "MANGO_URL": "mongodb://localhost:27017",
            "DB_NAME": "test_database",
            "JWT_SECRET": "test-secret",
        },
    )

    assert module.mongo_url == "mongodb://localhost:27017"
