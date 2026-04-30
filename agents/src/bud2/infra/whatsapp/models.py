from __future__ import annotations

from pydantic import BaseModel


class WhatsAppSendResult(BaseModel):
    external_message_id: str | None = None
    raw_response: dict[str, object]
