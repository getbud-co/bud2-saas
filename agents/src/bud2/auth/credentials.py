from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class CredentialContext:
    external_user_id: str | None = None
    organization_id: str | None = None
    channel: str | None = None


class Bud2CredentialProvider(Protocol):
    async def get_access_token(self, context: CredentialContext) -> str:
        raise NotImplementedError
