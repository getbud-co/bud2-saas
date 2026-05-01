from __future__ import annotations

from fastapi import APIRouter, Request
from sqlalchemy import text

from bud2.config import Settings
from bud2.infra.postgres.session import get_engine

router = APIRouter(tags=["Health"])


@router.get("/health/live")
async def live() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/health/ready")
async def ready(request: Request) -> dict[str, object]:
    settings: Settings = request.app.state.settings
    database_ready = False
    if settings.agents_database_url:
        try:
            engine = get_engine(settings)
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            database_ready = True
        except Exception:
            database_ready = False
    return {
        "status": "ok",
        "bud2_api_base_url": str(settings.bud2_api_base_url),
        "database_configured": settings.agents_database_url is not None,
        "database_ready": database_ready,
        "whatsapp_configured": bool(
            settings.whatsapp_verify_token and settings.whatsapp_app_secret
        ),
    }
