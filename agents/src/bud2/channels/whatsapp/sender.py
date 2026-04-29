from __future__ import annotations

import httpx

from bud2.channels.models import OutboundMessage
from bud2.channels.whatsapp.models import WhatsAppSendResult


class WhatsAppSender:
    def __init__(self, access_token: str, phone_number_id: str) -> None:
        self._access_token = access_token
        self._phone_number_id = phone_number_id

    async def send_text(self, message: OutboundMessage) -> WhatsAppSendResult:
        url = f"https://graph.facebook.com/v21.0/{self._phone_number_id}/messages"
        payload = {
            "messaging_product": "whatsapp",
            "to": message.external_conversation_id.split(":")[-1],
            "type": "text",
            "text": {"body": message.text},
        }
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                url,
                json=payload,
                headers={"Authorization": f"Bearer {self._access_token}"},
            )
            response.raise_for_status()
            data = response.json()
        external_id = None
        if messages := data.get("messages"):
            external_id = messages[0].get("id")
        return WhatsAppSendResult(external_message_id=external_id, raw_response=data)
