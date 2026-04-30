from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Literal

DeliveryStatus = Literal["pending", "processing", "sent", "failed", "dead"]


@dataclass(frozen=True)
class Delivery:
    id: str
    organization_id: str
    message_id: str
    status: DeliveryStatus
    attempts: int
    next_attempt_at: datetime
