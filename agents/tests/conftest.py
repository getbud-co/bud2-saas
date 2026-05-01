from __future__ import annotations

from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from bud2.api.server import create_app
from bud2.config import Settings
from bud2.infra.postgres.models import Base

TEST_DATABASE_URL = "postgresql+asyncpg://user:password@localhost:5432/bud2"


@pytest.fixture
def settings() -> Settings:
    return Settings(
        ENV="test",
        BUD2_API_BASE_URL="http://bud2-api.test",
        WHATSAPP_VERIFY_TOKEN="verify-token",
        WHATSAPP_APP_SECRET="secret",
        AGENTS_DATABASE_URL=TEST_DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://"),
    )


@pytest.fixture
def client(settings: Settings) -> TestClient:
    return TestClient(create_app(settings))


@pytest_asyncio.fixture(scope="session")
async def db_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False, poolclass=NullPool)
    async with engine.begin() as conn:
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS agents"))
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.execute(text("DROP SCHEMA IF EXISTS agents CASCADE"))
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(db_engine) -> AsyncGenerator[AsyncSession, None]:
    session_maker = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_maker() as session:
        yield session
        await session.rollback()
