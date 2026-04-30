from __future__ import annotations

from typing import Any

from psycopg.types.json import Jsonb
from psycopg_pool import AsyncConnectionPool


class WebhookEventRepository:
    def __init__(self, pool: AsyncConnectionPool) -> None:
        self._pool = pool

    async def create_if_new(
        self,
        *,
        channel: str,
        external_event_id: str,
        payload: dict[str, Any],
    ) -> bool:
        async with self._pool.connection() as conn:
            result = await conn.execute(
                """
                INSERT INTO agents.webhook_events (channel, external_event_id, payload)
                VALUES (%s, %s, %s)
                ON CONFLICT (channel, external_event_id) DO NOTHING
                """,
                (channel, external_event_id, Jsonb(payload)),
            )
            return result.rowcount == 1
