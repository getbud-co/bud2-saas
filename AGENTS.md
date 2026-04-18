# bud2

SaaS multi-tenant. Monorepo with Go backend and Next.js frontend.

## Structure

```
bud2/
├── compose.yml       # Local dev orchestration (backend + frontend + db)
├── Makefile          # Root targets: dev, build, test, lint, compose-up/down
├── backend/          # Go API
│   ├── cmd/api/      # Entrypoint (main.go — composition root)
│   ├── internal/     # Private application code (4-layer architecture)
│   │   ├── api/          # HTTP transport layer
│   │   │   ├── httputil/     # Shared HTTP helpers (WriteJSON, WriteProblem)
│   │   │   ├── middleware/   # Auth, tenant middleware
│   │   │   ├── organization/ # Organization HTTP handler + DTOs
│   │   │   ├── user/         # User HTTP handler + DTOs
│   │   │   └── bootstrap/    # Bootstrap HTTP handler + DTOs
│   │   ├── app/          # Application services (use cases)
│   │   │   ├── organization/ # Organization use cases (create, get, list, update)
│   │   │   ├── user/         # User use cases
│   │   │   └── bootstrap/    # Bootstrap use case
│   │   ├── domain/       # Entities, value objects, repository interfaces
│   │   │   ├── organization/ # Organization entity, Repository interface, errors
│   │   │   ├── user/         # User entity, Repository interface, errors
│   │   │   ├── auth/         # PasswordHasher interface
│   │   │   ├── tenant.go     # TenantID value object
│   │   │   ├── auth.go       # UserID, UserClaims
│   │   │   └── errors.go     # Shared domain errors
│   │   ├── infra/        # Concrete implementations
│   │   │   ├── postgres/     # sqlc generated code + repository implementations
│   │   │   ├── auth/         # JWT token issuing + PasswordHasher
│   │   │   └── rbac/         # Casbin enforcer
│   │   └── config/       # App configuration
│   ├── api/          # OpenAPI spec (openapi.yml — source of truth for API contract)
│   ├── migrations/   # Database migrations (golang-migrate)
│   ├── policies/     # Casbin RBAC model + policy
│   ├── sqlc.yml      # sqlc configuration
│   ├── Dockerfile    # Multi-stage production build
│   └── .golangci.yml # Linter configuration
├── frontend/         # Next.js 15 App
│   ├── Dockerfile    # Multi-stage production build (standalone output)
│   └── src/
│       ├── app/          # App Router (pages, layouts)
│       ├── components/   # React components
│       ├── lib/          # Utilities, API client (api.ts), generated types (types.ts)
│       ├── hooks/        # Custom React hooks
│       └── styles/       # Global styles
└── .github/workflows/ci.yml  # CI pipeline (lint, test, build)
```

## Architecture (Layered + Feature-based)

Four layers, each subdivided by feature. Dependency rule: api → app → domain ← infra.

```
cmd/api/main.go (composition root)
  └─ api/ → app/ → domain/
                       ↑
                    infra/ (implements domain/ interfaces)
```

- **api/**: HTTP transport. Handlers parse requests, call use cases, format responses. Contains DTOs, middleware, router.
- **app/**: Application services (use cases) that orchestrate business logic. Depends only on domain/.
- **domain/**: Entities, value objects, repository interfaces. Zero external dependencies. Subdivided by feature (organization/, user/).
- **infra/**: Concrete implementations of domain interfaces (postgres repos, JWT, Casbin). Depends on domain/ + external libs.
- **config/**: Loaded at composition root (main.go), injected into dependencies.

## Backend Tooling

- **chi** — HTTP router. Superset of net/http, handlers remain `http.HandlerFunc`.
- **sqlc** — Generates typed Go code from SQL queries. Config in `sqlc.yml`, queries in `internal/infra/postgres/queries/*.sql`, generated code in `internal/infra/postgres/sqlc/`. Run `make sqlc-gen` after changing queries or migrations.
- **golang-migrate** — SQL migrations in `migrations/` as `NNNNNN_desc.up.sql` / `NNNNNN_desc.down.sql`.
- **golang-jwt/jwt** — JWT stateless authentication. Middleware validates token and injects claims into `context.Context`.
- **go-playground/validator** — Input validation on handler request DTOs (format rules only). Business invariants stay in domain/usecase.
- **log/slog** — Structured logging (stdlib). JSON handler in production, text in development.
- **OpenTelemetry** — Traces, metrics, slog bridge. No-op exporter by default; swap via `OTEL_EXPORTER_OTLP_ENDPOINT` without code changes. chi middleware + otelpgx for automatic query instrumentation.

## API Contract

- **OpenAPI 3.1** spec-first in `backend/api/openapi.yml` — source of truth.
- TypeScript types generated from spec: `make api-types` → `frontend/src/lib/types.ts`.
- REST conventions: plural kebab-case resources (`/users`, `/order-items`), semantic HTTP verbs.
- Errors follow RFC 7807 (Problem Details) format, HTTP 422 for validation errors.

## Handler-UseCase Pattern

- Each use case has a single `Execute` method receiving a **Command** (struct) or primitives (≤3 params).
- Use case returns domain entities or primitives, never HTTP DTOs.
- Handler parses HTTP request → validates with go-playground/validator → builds Command → calls Execute → transforms result to Response DTO.
- Handler may orchestrate multiple use cases. Extract to Application Service only when the same orchestration is needed in 2+ handlers.
- Domain entities NEVER have `json:` tags — serialization belongs in handler DTOs.

## Multi-Tenancy (ADR-011)

Strategy: **row-level isolation** — shared schema, `tenant_id UUID NOT NULL` on every business table.

- `tenant_id` extracted from JWT claim once in the handler middleware → injected into `context.Context`.
- Handler extracts via `TenantFromContext(ctx)` → passes as value in Command → usecase → repository params → sqlc `WHERE tenant_id = $1`.
- `TenantID` is a named Value Object in `internal/domain/` — not a raw string or UUID.
- Every business table has `tenant_id` + composite index `(tenant_id, id)`.
- Uniqueness constraints are scoped: `UNIQUE (tenant_id, field)`, never `UNIQUE (field)`.
- RLS (Row-Level Security) enabled on critical tables as a second line of defense.
- Onboarding a new tenant = `INSERT INTO tenants` — never DDL.
- Use cases and domain are unaware of auth/middleware — `TenantID` arrives via Command.

## Conventions

### Backend (Go)
- 4-layer architecture: `api/` → `app/` → `domain/` ← `infra/`, each subdivided by feature
- Business logic lives in `internal/app/`, never in handlers
- Domain types and repository interfaces in `internal/domain/<feature>/`
- Concrete implementations (DB, external services) in `internal/infra/`
- Handlers in `internal/api/<feature>/` parse requests, call use cases, format responses
- Cross-cutting HTTP concerns (middleware, response helpers) in `api/middleware/` and `api/httputil/`
- SQL queries are explicit (sqlc), never hidden behind an ORM
- Validation of format/structure in handler DTOs; validation of business invariants in domain/app
- Tests next to the code they test (`_test.go` suffix)
- Dependencies injected via interfaces; infrastructure never imported directly by app layer

### Frontend (Next.js)
- App Router with `src/` directory
- TypeScript strict mode
- Path alias `@/*` maps to `src/*`
- Package manager: Yarn classic (`frontend/yarn.lock`); use `yarn` commands in the frontend workspace
- Components are functional with TypeScript props
- API client at `src/lib/api.ts` — all backend calls go through it
- Types at `src/lib/types.ts` — generated from OpenAPI spec, never written manually

### General
- Environment variables via `.env` files (never committed), `.env.example` for documentation
- Backend runs on port 8080 by default
- Frontend runs on port 3000 by default
- `make dev` to run both services locally
- `make compose-up` to run via Docker Compose
- Frontend install/build/lint commands use Yarn in the `frontend/` workspace
- `make sqlc-gen` after changing SQL queries or migrations
- `make api-types` after changing the OpenAPI spec
- `make migrate-up` to run database migrations

## Architectural Patterns

### Pagination
All list endpoints support pagination with `page` and `size` query parameters:
- Default: `page=1`, `size=20`
- Maximum page size: `100` (enforced to prevent OOM)

Example: `GET /users?page=2&size=50`

### Password Hashing
Password hashing is defined as an interface in `domain/auth/password.go`:
```go
type PasswordHasher interface {
    Hash(password string) (string, error)
    Verify(password, hash string) bool
}
```

Implementation (`infra/auth/password.go`) uses bcrypt with cost 12. The interface is injected into use cases, following the Dependency Rule.

### Soft Delete
All business tables have `deleted_at` column. Records are not physically deleted; instead:
- `deleted_at` is set to current timestamp on deletion
- All queries filter by `deleted_at IS NULL`
- Partial indexes ensure query performance: `WHERE deleted_at IS NULL`

Migration: `000004_add_soft_delete.up.sql`

### Unit of Work
Transaction management is handled via the Unit of Work pattern (`app/unit_of_work.go`):
```go
type UnitOfWork interface {
    Begin(ctx context.Context) error
    Commit() error
    Rollback() error
    Organizations() organization.Repository
    Users() user.Repository
}
```

Implementation: `infra/postgres/unit_of_work.go`

Useful when multiple repositories must participate in the same transaction atomically.

### API Contract
OpenAPI 3.1 spec at `backend/api/openapi.yml` includes:
- `/health` - System health check
- `/organizations` - Organization CRUD
- `/users` - User CRUD with tenant isolation
- `/auth/login` - Authentication
- `/bootstrap` - Initial setup

Security: JWT Bearer tokens via `Authorization: Bearer <token>` header.
Errors follow RFC 7807 (Problem Details) format.
