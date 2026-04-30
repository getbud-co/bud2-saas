from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class WebhookEvent:
    id: str
    channel: str
    external_event_id: str
    received_at: datetime
    payload: dict[str, object]
