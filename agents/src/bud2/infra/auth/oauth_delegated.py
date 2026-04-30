from __future__ import annotations

from bud2.infra.auth.credentials import Bud2CredentialProvider, CredentialContext


class OAuthDelegatedCredentialProvider(Bud2CredentialProvider):
    async def get_access_token(self, context: CredentialContext) -> str:
        raise NotImplementedError("OAuth delegated credentials are out of the initial scope")
