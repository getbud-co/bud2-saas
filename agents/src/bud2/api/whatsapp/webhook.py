from __future__ import annotations

import hashlib
from typing import Any

import structlog
from fastapi import APIRouter, HTTPException, Query, Request, Response, status

from bud2.config import Settings
from bud2.infra.postgres.repositories import (
    ChannelConnectionRepository,
    ConversationRepository,
    MessageRepository,
    WebhookEventRepository,
)
from bud2.infra.postgres.session import get_session_maker
from bud2.infra.whatsapp.parser import parse_whatsapp_payload
from bud2.infra.whatsapp.verifier import verify_meta_signature

router = APIRouter(prefix="/webhooks/whatsapp", tags=["WhatsApp"])
logger = structlog.get_logger(__name__)


@router.get("")
async def verify_webhook(
    request: Request,
    mode: str | None = Query(default=None, alias="hub.mode"),
    verify_token: str | None = Query(default=None, alias="hub.verify_token"),
    challenge: str | None = Query(default=None, alias="hub.challenge"),
) -> Response:
    settings: Settings = request.app.state.settings
    if not settings.whatsapp_verify_token:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="not configured",
        )
    if mode == "subscribe" and verify_token == settings.whatsapp_verify_token and challenge:
        return Response(content=challenge, media_type="text/plain")
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="verification failed")


@router.post("", status_code=status.HTTP_200_OK)
async def receive_webhook(request: Request) -> dict[str, object]:
    settings: Settings = request.app.state.settings
    body = await request.body()
    signature = request.headers.get("x-hub-signature-256")
    if not settings.whatsapp_app_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="not configured",
        )
    if not verify_meta_signature(body, signature, settings.whatsapp_app_secret):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="invalid signature")

    try:
        payload: dict[str, Any] = await request.json()
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid JSON payload",
        ) from exc
    if not isinstance(payload, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="payload must be a JSON object",
        )

    session_maker = get_session_maker(settings)
    async with session_maker() as session:
        event_id = hashlib.sha256(body).hexdigest()
        created = await WebhookEventRepository(session).create_if_new(
            channel="whatsapp",
            external_event_id=event_id,
            payload=payload,
        )
        if not created:
            logger.info("whatsapp webhook duplicate event", event_id=event_id)
            return {"accepted": True, "duplicate": True, "message_count": 0}

        messages = parse_whatsapp_payload(payload)
        processed_count = 0

        for msg in messages:
            conn = await ChannelConnectionRepository(session).get_by_external_user(
                channel="whatsapp",
                external_account_id=msg.external_user_id,
            )
            if conn is None:
                logger.info(
                    "whatsapp user not recognized",
                    external_user_id=msg.external_user_id,
                )
                continue

            conversation = await ConversationRepository(session).get_or_create(
                channel="whatsapp",
                external_conversation_id=msg.external_conversation_id,
                external_user_id=msg.external_user_id,
                organization_id=conn.organization_id,
            )

            await MessageRepository(session).save(
                organization_id=conn.organization_id,
                conversation_id=conversation.id,
                channel="whatsapp",
                direction="inbound",
                text=msg.text,
                external_message_id=msg.external_message_id,
                payload=msg.raw_payload,
            )
            processed_count += 1

        await session.commit()

    logger.info(
        "whatsapp webhook accepted",
        event_id=event_id,
        message_count=len(messages),
        processed_count=processed_count,
    )
    return {
        "accepted": True,
        "duplicate": False,
        "message_count": len(messages),
        "processed_count": processed_count,
    }
