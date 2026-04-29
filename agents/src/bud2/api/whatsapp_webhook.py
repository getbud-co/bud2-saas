from __future__ import annotations

import hashlib
from typing import Any

import structlog
from fastapi import APIRouter, HTTPException, Query, Request, Response, status
from psycopg_pool import AsyncConnectionPool

from bud2.channels.whatsapp.parser import parse_whatsapp_payload
from bud2.channels.whatsapp.verifier import verify_meta_signature
from bud2.config import Settings
from bud2.db.repositories import WebhookEventRepository

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
    pool: AsyncConnectionPool | None = request.app.state.db_pool
    if pool is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="database not configured",
        )

    event_id = hashlib.sha256(body).hexdigest()
    created = await WebhookEventRepository(pool).create_if_new(
        channel="whatsapp",
        external_event_id=event_id,
        payload=payload,
    )
    messages = parse_whatsapp_payload(payload)
    logger.info("whatsapp webhook accepted", duplicate=not created, message_count=len(messages))
    return {"accepted": True, "duplicate": not created, "message_count": len(messages)}
