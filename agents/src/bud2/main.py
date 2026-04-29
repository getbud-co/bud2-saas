from __future__ import annotations

import uvicorn

from bud2.api.server import create_app
from bud2.config import Settings
from bud2.observability.logging import configure_logging


def main() -> None:
    settings = Settings()
    configure_logging(settings)
    uvicorn.run(create_app(settings), host=settings.host, port=settings.port)


if __name__ == "__main__":
    main()
