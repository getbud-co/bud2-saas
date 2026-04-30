from __future__ import annotations

from bud2.config import Settings


def test_defaults_are_valid() -> None:
    settings = Settings()

    assert settings.port == 8090
    assert settings.bud2_api_base_url == "http://localhost:8080"
