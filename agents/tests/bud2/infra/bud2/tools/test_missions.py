from __future__ import annotations

import pytest
import respx
from httpx import Response

from bud2.infra.auth.credentials import CredentialContext
from bud2.infra.auth.static_token import StaticTokenCredentialProvider
from bud2.infra.bud2.client import Bud2Client
from bud2.infra.bud2.tools.missions import MissionTools


@pytest.mark.asyncio
@respx.mock
async def test_list_missions_calls_bud2_api() -> None:
    route = respx.get("http://bud2-api.test/missions").mock(
        return_value=Response(200, json={"data": [], "total": 0, "page": 1, "size": 20})
    )
    client = Bud2Client("http://bud2-api.test", StaticTokenCredentialProvider("token"))
    tools = MissionTools(client)
    ctx = CredentialContext(channel="whatsapp")

    result = await tools.list_missions(ctx)

    assert result == {"data": [], "total": 0, "page": 1, "size": 20}
    assert route.called
    assert route.calls[0].request.headers["authorization"] == "Bearer token"
