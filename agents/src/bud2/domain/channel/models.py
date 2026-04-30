from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

ChannelName = Literal["whatsapp", "teams"]


class InboundMessage(BaseModel):
    channel: ChannelName
    external_message_id: str
    external_conversation_id: str
    external_user_id: str
    text: str
    received_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    raw_payload: dict[str, Any]


class OutboundMessage(BaseModel):
    channel: ChannelName
    external_conversation_id: str
    text: str
