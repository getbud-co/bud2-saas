# ADR-007: sqlc com PostgreSQL

**Data**: 2026-03-24
**Status**: Aceito

## Decisão

O projeto usa `sqlc` com PostgreSQL a partir de:

- queries escritas manualmente em `backend/internal/infra/postgres/queries/`
- migrations em `backend/migrations/`
- geração para `backend/internal/infra/postgres/sqlc/`

O código gerado não é editado manualmente.

## Consequências

- O schema real continua definido pelas migrations.
- Repositórios em `infra/postgres` adaptam o código gerado para contratos do domínio.
- Integração com Postgres real é o melhor lugar para validar comportamento de persistência.
