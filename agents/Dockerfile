FROM python:3.12-slim AS builder

WORKDIR /app

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

RUN pip install --no-cache-dir uv

COPY pyproject.toml uv.lock* ./
RUN uv sync --frozen --no-dev

COPY . .
RUN uv sync --frozen --no-dev

FROM python:3.12-slim

WORKDIR /app

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1

COPY --from=builder /app /app

EXPOSE 8090

CMD ["bud2-agents"]
