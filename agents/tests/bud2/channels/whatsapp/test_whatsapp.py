from __future__ import annotations

import hashlib
import hmac

from bud2.channels.whatsapp.parser import parse_whatsapp_payload
from bud2.channels.whatsapp.verifier import verify_meta_signature


def test_verify_meta_signature() -> None:
    body = b'{"hello":"world"}'
    secret = "secret"
    signature = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()

    assert verify_meta_signature(body, signature, secret)


def test_parse_text_messages() -> None:
    payload = {
        "entry": [
            {
                "changes": [
                    {
                        "value": {
                            "metadata": {"phone_number_id": "123"},
                            "messages": [
                                {"id": "wamid.1", "from": "5511999999999", "text": {"body": "Oi"}}
                            ],
                        }
                    }
                ]
            }
        ]
    }

    messages = parse_whatsapp_payload(payload)

    assert len(messages) == 1
    assert messages[0].external_message_id == "wamid.1"
    assert messages[0].external_conversation_id == "123:5511999999999"
    assert messages[0].text == "Oi"
