from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from bud2 import __version__
from bud2.api.health import router as health_router
from bud2.api.whatsapp_webhook import router as whatsapp_router
from bud2.config import Settings
from bud2.db.pool import create_pool


def create_app(settings: Settings | None = None) -> FastAPI:
    app_settings = settings or Settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        app.state.db_pool = None
        if app_settings.agents_database_url:
            pool = create_pool(app_settings.agents_database_url)
            await pool.open()
            app.state.db_pool = pool
        try:
            yield
        finally:
            if app.state.db_pool is not None:
                await app.state.db_pool.close()

    app = FastAPI(title="bud2 Agents", version=__version__, lifespan=lifespan)
    app.state.settings = app_settings
    app.state.db_pool = None

    app.include_router(health_router)
    app.include_router(whatsapp_router)
    return app
