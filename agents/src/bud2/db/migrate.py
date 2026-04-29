from __future__ import annotations

import asyncio
import hashlib
from pathlib import Path

import psycopg

from bud2.config import Settings

MIGRATIONS_DIR = Path(__file__).parent / "migrations"


async def run_migrations(database_url: str) -> None:
    async with await psycopg.AsyncConnection.connect(database_url) as conn:
        await conn.execute("SELECT pg_advisory_xact_lock(%s)", (42620013,))
        await conn.execute("CREATE SCHEMA IF NOT EXISTS agents")
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS agents.schema_migrations (
                version TEXT PRIMARY KEY,
                checksum TEXT NOT NULL,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        for migration in sorted(MIGRATIONS_DIR.glob("*.sql")):
            version = migration.name
            contents = migration.read_text()
            checksum = hashlib.sha256(contents.encode()).hexdigest()
            exists = await conn.execute(
                "SELECT checksum FROM agents.schema_migrations WHERE version = %s",
                (version,),
            )
            row = await exists.fetchone()
            if row:
                if row[0] != checksum:
                    raise RuntimeError(f"migration {version} checksum mismatch")
                continue
            await conn.execute(contents)
            await conn.execute(
                "INSERT INTO agents.schema_migrations (version, checksum) VALUES (%s, %s)",
                (version, checksum),
            )


def main() -> None:
    settings = Settings()
    if not settings.agents_database_url:
        raise SystemExit("AGENTS_DATABASE_URL is required to run migrations")
    asyncio.run(run_migrations(settings.agents_database_url))
