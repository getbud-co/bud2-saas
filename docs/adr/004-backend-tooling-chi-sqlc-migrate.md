# ADR-004: Tooling do Backend

**Data**: 2026-03-24
**Status**: Aceito

## Decisão

O backend usa:

- `chi` para roteamento e middlewares HTTP
- `pgx` + `sqlc` para acesso a dados com SQL explícito
- `golang-migrate` para migrations SQL

Paths relevantes:

- queries SQL: `backend/internal/infra/postgres/queries/*.sql`
- código gerado pelo sqlc: `backend/internal/infra/postgres/sqlc/`
- migrations: `backend/migrations/`

## Consequências

- O projeto mantém SQL visível e tipado.
- A camada `api/` continua baseada em `net/http`.
- Mudanças em query ou migration exigem `make sqlc-gen` quando aplicável.
