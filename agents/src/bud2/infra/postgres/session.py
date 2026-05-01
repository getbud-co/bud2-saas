from __future__ import annotations

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from bud2.config import Settings

_engine = None
_session_maker = None


def get_engine(settings: Settings | None = None) -> AsyncEngine:
    global _engine
    if _engine is None:
        app_settings = settings or Settings()
        if not app_settings.agents_database_url:
            raise RuntimeError("AGENTS_DATABASE_URL is not set")
        url = app_settings.agents_database_url.replace(
            "postgresql://", "postgresql+asyncpg://", 1
        )
        _engine = create_async_engine(url, echo=app_settings.env == "development")
    return _engine


def get_session_maker(settings: Settings | None = None) -> async_sessionmaker[AsyncSession]:
    global _session_maker
    if _session_maker is None:
        engine = get_engine(settings)
        _session_maker = async_sessionmaker(engine, expire_on_commit=False)
    return _session_maker


async def close_engine() -> None:
    global _engine
    if _engine is not None:
        await _engine.dispose()
        _engine = None
