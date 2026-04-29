from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from bud2.api.server import create_app
from bud2.config import Settings


@pytest.fixture
def settings() -> Settings:
    return Settings(
        ENV="test",
        BUD2_API_BASE_URL="http://bud2-api.test",
        WHATSAPP_VERIFY_TOKEN="verify-token",
        WHATSAPP_APP_SECRET="secret",
    )


@pytest.fixture
def client(settings: Settings) -> TestClient:
    return TestClient(create_app(settings))
