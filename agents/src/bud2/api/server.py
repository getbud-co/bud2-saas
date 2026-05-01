from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from bud2 import __version__
from bud2.api.health import router as health_router
from bud2.api.whatsapp.webhook import router as whatsapp_router
from bud2.config import Settings
from bud2.infra.postgres.session import close_engine, get_engine, get_session_maker


def create_app(settings: Settings | None = None) -> FastAPI:
    app_settings = settings or Settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        app.state.settings = app_settings
        if app_settings.agents_database_url:
            get_engine(app_settings)
            get_session_maker(app_settings)
        try:
            yield
        finally:
            await close_engine()

    app = FastAPI(title="bud2 Agents", version=__version__, lifespan=lifespan)
    app.state.settings = app_settings

    app.include_router(health_router)
    app.include_router(whatsapp_router)
    return app
