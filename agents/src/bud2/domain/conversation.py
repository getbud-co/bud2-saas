from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class Conversation:
    id: str
    organization_id: str
    channel: str
    external_conversation_id: str
    created_at: datetime
    updated_at: datetime
