from __future__ import annotations

from psycopg_pool import AsyncConnectionPool


def create_pool(database_url: str) -> AsyncConnectionPool:
    return AsyncConnectionPool(database_url, open=False)


async def ping(pool: AsyncConnectionPool) -> None:
    async with pool.connection() as conn:
        await conn.execute("SELECT 1")
