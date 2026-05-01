from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from bud2 import __version__
from bud2.api.health import router as health_router
from bud2.api.whatsapp.webhook import router as whatsapp_router
from bud2.app.runtime.agent import build_root_agent
from bud2.app.runtime.service import AgentRuntime
from bud2.config import Settings
from bud2.infra.bud2.auth import credential_provider_from_settings
from bud2.infra.bud2.client import Bud2Client
from bud2.infra.bud2.tools.missions import MissionTools
from bud2.infra.bud2.tools.teams import TeamTools
from bud2.infra.postgres.session import close_engine, get_engine, get_session_maker


def create_app(settings: Settings | None = None) -> FastAPI:
    app_settings = settings or Settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        app.state.settings = app_settings

        if app_settings.agents_database_url:
            get_engine(app_settings)
            get_session_maker(app_settings)

        if app_settings.bud2_api_token:
            credentials = credential_provider_from_settings(app_settings)
            bud2_client = Bud2Client(app_settings.bud2_api_base_url, credentials)
            mission_tools = MissionTools(bud2_client)
            team_tools = TeamTools(bud2_client)
            app.state.runtime = AgentRuntime(
                root_agent_factory=lambda tools: build_root_agent(app_settings, tools=tools),
                mission_tools=mission_tools,
                team_tools=team_tools,
            )
        else:
            app.state.runtime = None

        try:
            yield
        finally:
            await close_engine()

    app = FastAPI(title="bud2 Agents", version=__version__, lifespan=lifespan)
    app.state.settings = app_settings

    app.include_router(health_router)
    app.include_router(whatsapp_router)
    return app
