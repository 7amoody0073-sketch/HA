import importlib.util
import sys
from pathlib import Path


def _load_server_module(monkeypatch, env):
    for key in ["MONGO_URL", "MANGO_URL", "DB_NAME", "JWT_SECRET", "EMERGENT_LLM_KEY", "INTEGRATION_PROXY_URL"]:
        monkeypatch.delenv(key, raising=False)
    for key, value in env.items():
        monkeypatch.setenv(key, value)

    server_path = Path(__file__).resolve().parents[1] / "backend" / "server.py"
    spec = importlib.util.spec_from_file_location("backend_server_under_test", server_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules.pop("backend_server_under_test", None)
    spec.loader.exec_module(module)
    return module


def test_init_storage_falls_back_to_local_when_emergent_unavailable(monkeypatch):
    module = _load_server_module(
        monkeypatch,
        {
            "MONGO_URL": "mongodb://localhost:27017",
            "DB_NAME": "test_database",
            "JWT_SECRET": "test-secret",
        },
    )

    def broken_post(*args, **kwargs):
        raise RuntimeError("unavailable")

    monkeypatch.setattr(module.requests, "post", broken_post)

    result = module.init_storage()

    assert result == "local"
