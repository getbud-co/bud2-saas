# bud2 agents

Python ADK application for bud2 conversational agents.

The agents service is intentionally separate from the Go API. It receives channel events, runs agent workflows, and calls the bud2 API through its public OpenAPI contract.

## Local Setup

```bash
uv sync
cp .env.example .env
uv run bud2-agents
```

The service listens on `http://localhost:8090` by default.

Agents state is stored in the same Postgres database used by the API during the first version,
under the dedicated SQL schema `agents`.

## Commands

```bash
uv run pytest
uv run ruff check .
uv run mypy src
make agents-api-client
make migrate-agents
```

## Architecture

- `api/`: FastAPI HTTP boundary for health, WhatsApp webhooks, and future auth callbacks.
- `app/`: ADK root agent and runtime orchestration.
- `channels/`: provider-specific adapters. WhatsApp is the first supported channel.
- `clients/bud2/`: bud2 API client integration. Generated OpenAPI client lives under `generated/`.
- `tools/`: explicit allowlisted tools exposed to the agent.
- `db/`: agents-owned database connectivity, migrations, and repositories.
- `domain/`: agents runtime domain models.

## Authentication Scope

Delegated OAuth is intentionally out of the initial scope. The initial implementation uses a configured bud2 API bearer token through `StaticTokenCredentialProvider`. OAuth will replace only the credential provider later.
