from __future__ import annotations

from typing import Any

from bud2.domain.channel.models import InboundMessage


def parse_whatsapp_payload(payload: dict[str, Any]) -> list[InboundMessage]:
    messages: list[InboundMessage] = []
    entries = payload.get("entry", [])
    if not isinstance(entries, list):
        return messages
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        changes = entry.get("changes", [])
        if not isinstance(changes, list):
            continue
        for change in changes:
            if not isinstance(change, dict):
                continue
            value = change.get("value", {})
            if not isinstance(value, dict):
                continue
            metadata = value.get("metadata", {})
            if not isinstance(metadata, dict):
                continue
            phone_number_id = metadata.get("phone_number_id")
            if not isinstance(phone_number_id, str) or not phone_number_id:
                continue
            raw_messages = value.get("messages", [])
            if not isinstance(raw_messages, list):
                continue
            for message in raw_messages:
                if not isinstance(message, dict):
                    continue
                text_payload = message.get("text", {})
                if not isinstance(text_payload, dict):
                    continue
                text = text_payload.get("body")
                if not isinstance(text, str) or not text:
                    continue
                from_id = message.get("from")
                message_id = message.get("id")
                if not isinstance(from_id, str) or not isinstance(message_id, str):
                    continue
                messages.append(
                    InboundMessage(
                        channel="whatsapp",
                        external_message_id=message_id,
                        external_conversation_id=f"{phone_number_id}:{from_id}",
                        external_user_id=from_id,
                        text=text,
                        raw_payload=message,
                    )
                )
    return messages
