from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Literal

MessageDirection = Literal["inbound", "outbound"]


@dataclass(frozen=True)
class Message:
    id: str
    organization_id: str
    conversation_id: str
    direction: MessageDirection
    text: str
    created_at: datetime
