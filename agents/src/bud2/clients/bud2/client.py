from __future__ import annotations

from typing import Any
from uuid import UUID

import httpx

from bud2.auth.credentials import Bud2CredentialProvider, CredentialContext
from bud2.clients.bud2.errors import Bud2APIError
from bud2.clients.bud2.generated.bud2_api_client.api.missions import (
    get_missions,
    get_missions_id,
)
from bud2.clients.bud2.generated.bud2_api_client.api.teams import get_teams
from bud2.clients.bud2.generated.bud2_api_client.client import AuthenticatedClient


class Bud2Client:
    def __init__(self, base_url: str, credentials: Bud2CredentialProvider) -> None:
        self._base_url = base_url.rstrip("/")
        self._credentials = credentials

    async def _authenticated_client(
        self,
        credential_context: CredentialContext,
    ) -> AuthenticatedClient:
        token = await self._credentials.get_access_token(credential_context)
        return AuthenticatedClient(
            base_url=self._base_url,
            token=token,
            timeout=httpx.Timeout(30.0, connect=5.0),
            raise_on_unexpected_status=False,
        )

    @staticmethod
    def _unwrap_response(status_code: int, content: bytes, parsed: Any) -> Any:
        if status_code >= 400:
            raise Bud2APIError(status_code, content.decode(errors="replace"))
        if hasattr(parsed, "to_dict"):
            return parsed.to_dict()
        return parsed

    async def list_missions(
        self,
        credential_context: CredentialContext,
        *,
        page: int = 1,
        size: int = 20,
    ) -> Any:
        client = await self._authenticated_client(credential_context)
        async with client:
            response = await get_missions.asyncio_detailed(
                client=client,
                page=page,
                size=size,
            )
        return self._unwrap_response(
            int(response.status_code),
            response.content,
            response.parsed,
        )

    async def get_mission(self, credential_context: CredentialContext, mission_id: str) -> Any:
        try:
            parsed_mission_id = UUID(mission_id)
        except ValueError as exc:
            raise Bud2APIError(400, "mission_id must be a valid UUID") from exc
        client = await self._authenticated_client(credential_context)
        async with client:
            response = await get_missions_id.asyncio_detailed(
                parsed_mission_id,
                client=client,
            )
        return self._unwrap_response(
            int(response.status_code),
            response.content,
            response.parsed,
        )

    async def list_teams(
        self,
        credential_context: CredentialContext,
        *,
        page: int = 1,
        size: int = 20,
    ) -> Any:
        client = await self._authenticated_client(credential_context)
        async with client:
            response = await get_teams.asyncio_detailed(
                client=client,
                page=page,
                size=size,
            )
        return self._unwrap_response(
            int(response.status_code),
            response.content,
            response.parsed,
        )
