# ADR-004: Tooling do Backend — chi, sqlc, golang-migrate

**Data**: 2026-03-24
**Status**: Aceito

## Contexto

O backend Go precisa de três ferramentas fundamentais: HTTP router, acesso a dados e migrations de banco. A escolha deve ser coerente com a filosofia do projeto — SQL explícito, sem mágica, Go idiomático — e compatível com a Clean Architecture definida nos ADRs anteriores.

## Decisão

### HTTP Router: chi

- Superset de `net/http` — handlers são `http.HandlerFunc` padrão.
- Middleware chain, route groups, URL params sem acoplamento de framework.
- Qualquer middleware `net/http` funciona sem adapter.

### Acesso a dados: sqlc

- Gera código Go tipado a partir de queries SQL puras.
- Zero reflection, performance igual a `database/sql` nativo.
- Código gerado implementa as interfaces definidas em `domain/`.
- Queries ficam em `backend/internal/infra/sqlc/queries/` como arquivos `.sql`.
- Schema e configuração em `backend/sqlc.yml`.

### Migrations: golang-migrate

- Migrations SQL versionadas em `backend/migrations/`.
- Par de arquivos por migration: `NNNNNN_description.up.sql` / `NNNNNN_description.down.sql`.
- Executável como CLI standalone e como library Go.

## Consequências

**Positivas:**
- As três ferramentas compartilham a mesma filosofia: SQL explícito, sem ORM, sem mágica.
- chi não acopla handlers ao framework — camada `handler/` permanece `net/http` puro.
- sqlc garante type safety em compile time — erros de SQL são pegos antes do runtime.
- golang-migrate é o mais battle-tested do ecossistema, suporta todos os bancos relevantes.

**Negativas:**
- sqlc requer rodar `sqlc generate` quando queries mudam — passo extra no workflow.
- golang-migrate gera dois arquivos por migration — mais arquivos que soluções single-file.

## Alternativas Consideradas

- **echo** (router): Descartado por acoplar handlers via `echo.Context` — viola a independência da camada de transporte (ADR-003).
- **gin** (router): Descartado pelo mesmo motivo — context proprietário.
- **GORM** (ORM): Descartado por esconder SQL, dificultar queries complexas e adicionar reflection/mágica.
- **sqlx** (data access): Alternativa válida, mas sem type safety em compile time. sqlc oferece garantias mais fortes.
- **goose** (migrations): Alternativa válida, mas golang-migrate tem ecossistema maior e mais integrações.
- **atlas** (migrations): Descartado por ser mais opinativo (approach declarativo) e curva de aprendizado maior.

## Referências

- chi: https://github.com/go-chi/chi
- sqlc: https://sqlc.dev
- golang-migrate: https://github.com/golang-migrate/migrate
