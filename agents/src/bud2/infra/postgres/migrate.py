from __future__ import annotations

import subprocess
import sys

from bud2.config import Settings


def main() -> None:
    settings = Settings()
    if not settings.agents_database_url:
        raise SystemExit("AGENTS_DATABASE_URL is required to run migrations")

    env = {"AGENTS_DATABASE_URL": settings.agents_database_url}
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        capture_output=False,
        env=env,
    )
    raise SystemExit(result.returncode)
