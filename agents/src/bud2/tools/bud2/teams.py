from __future__ import annotations

from typing import Any

from bud2.auth.credentials import CredentialContext
from bud2.clients.bud2.client import Bud2Client


class TeamTools:
    def __init__(self, client: Bud2Client, credential_context: CredentialContext) -> None:
        self._client = client
        self._credential_context = credential_context

    async def list_teams(self, page: int = 1, size: int = 20) -> Any:
        """List bud2 teams available to the authenticated user."""
        page = max(page, 1)
        size = min(max(size, 1), 100)
        return await self._client.list_teams(self._credential_context, page=page, size=size)
