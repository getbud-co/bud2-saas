from __future__ import annotations

from fastapi import APIRouter, Request
from psycopg_pool import AsyncConnectionPool

from bud2.config import Settings
from bud2.infra.postgres.pool import ping

router = APIRouter(tags=["Health"])


@router.get("/health/live")
async def live() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/health/ready")
async def ready(request: Request) -> dict[str, object]:
    settings: Settings = request.app.state.settings
    pool: AsyncConnectionPool | None = request.app.state.db_pool
    database_ready = False
    if pool is not None:
        await ping(pool)
        database_ready = True
    return {
        "status": "ok",
        "bud2_api_base_url": str(settings.bud2_api_base_url),
        "database_configured": settings.agents_database_url is not None,
        "database_ready": database_ready,
        "whatsapp_configured": bool(
            settings.whatsapp_verify_token and settings.whatsapp_app_secret
        ),
    }
