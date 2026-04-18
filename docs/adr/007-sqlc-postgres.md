# ADR-007: sqlc com PostgreSQL no modo database

**Data**: 2026-03-24
**Status**: Aceito

## Contexto

O sqlc pode operar em dois modos para validar queries: `database` (conecta ao banco real) ou `file` (analisa SQL estático). O banco de dados escolhido é PostgreSQL.

## Decisão

Adotar **sqlc no modo `database`** com **PostgreSQL 18**.

- `sqlc.yml` aponta para o schema real gerado pelas migrations.
- O modo `database` garante que as queries são validadas contra o schema real — pega erros de tipo, colunas inexistentes e funções inválidas em compile time.
- Ambiente de CI usa PostgreSQL via Docker (service container no GitHub Actions).
- Código gerado vai para `internal/infra/postgres/` — nunca commitado direto, sempre regenerado.

### Estrutura sqlc

```
backend/
├── sqlc.yml
├── internal/
│   └── infra/
│       └── postgres/
│           ├── db.go          # gerado pelo sqlc
│           ├── models.go      # gerado pelo sqlc
│           └── queries/       # gerado pelo sqlc
│               └── users.sql.go
└── internal/infra/sqlc/
    └── queries/
        └── users.sql          # escrito à mão — fonte da verdade
```

### sqlc.yml (base)

```yaml
version: "2"
sql:
  - engine: "postgresql"
    queries: "internal/infra/sqlc/queries"
    schema: "migrations"
    gen:
      go:
        package: "postgres"
        out: "internal/infra/postgres"
        emit_interface: true
        emit_json_tags: false
```

### Makefile

```makefile
sqlc-gen:
    sqlc generate
```

`sqlc generate` deve ser executado após qualquer alteração em queries `.sql` ou migrations.

## Consequências

**Positivas:**
- Queries validadas contra schema real — zero surpresas em runtime.
- `emit_interface: true` gera interfaces Go que se encaixam diretamente nas interfaces de `domain/`.
- `emit_json_tags: false` mantém as structs geradas limpas — sem tags de serialização nos modelos de infra.

**Negativas:**
- CI precisa de PostgreSQL disponível durante `sqlc generate` no modo `database`.
- Passo extra `make sqlc-gen` no workflow de desenvolvimento.

## Alternativas Consideradas

- **Modo `file`**: Mais simples, sem banco no CI, mas não valida queries contra schema real — descartado.
- **MySQL/SQLite**: Descartados. PostgreSQL é a escolha padrão para projetos Go de produção com features avançadas (JSONB, arrays, full-text search).

## Referências

- https://sqlc.dev/docs/reference/config
- PostgreSQL 18: https://www.postgresql.org/docs/18/
