from __future__ import annotations

from bud2.auth.credentials import Bud2CredentialProvider, CredentialContext


class StaticTokenCredentialProvider(Bud2CredentialProvider):
    def __init__(self, token: str) -> None:
        self._token = token

    async def get_access_token(self, context: CredentialContext) -> str:
        return self._token
