# bud2

Repository-specific guidance for AI agents. Keep this file short and durable: only stable engineering rules, architectural invariants, and source-of-truth locations belong here. Extended explanations live in `README.md` and `docs/adr/`.

## Working Style
- Read the relevant code before changing it and follow existing local patterns.
- Prefer the smallest correct change that fully solves the problem.
- Favor clarity, cohesion, testability, and maintainability over cleverness or speculative abstractions.
- When multiple valid approaches exist, choose the one most consistent with the current codebase and project references.

## Project
- SaaS multi-tenant monorepo.
- Backend: Go (`backend/`).
- Frontend: React + Vite (`frontend/`); use `npm` in the frontend workspace.

## Architecture
- The backend follows Clean Architecture with DDD-style domain modeling.
- Dependency rule: `api -> app -> domain <- infra`.
- Organize code by feature inside the existing layers.
- `domain/` contains entities, value objects, domain errors, and repository/service interfaces.
- `app/` implements use cases and application orchestration.
- `api/` handles transport concerns only: routing, request parsing, validation, response mapping, and middleware.
- `infra/` implements persistence, authentication, authorization, and external integrations.
- Do not place business rules in handlers, middleware, UI components, SQL, or generated code.
- Domain aggregates are constructed via factory functions (e.g. `NewMission`); factories generate IDs, apply defaults, and enforce invariants — aggregates are always-valid.
- Use cases orchestrate (validate cross-aggregate references, persist) but do not apply defaults or generate IDs.
- Aggregate invariants are private to the aggregate and called only by the factory and mutator methods; callers do not validate aggregates externally.
- Persistence uses explicit SQL with `sqlc`; do not introduce an ORM.

## Multi-Tenancy
- The application is multi-tenant. `Organization` is the tenant boundary and active tenant scope when tenant-scoped behavior applies.
- Preserve tenant isolation end-to-end in every business operation.
- Pass `TenantID`/`OrganizationID` explicitly through commands and parameters when tenant-scoped behavior is required.
- Do not add tenant-bypassing reads, writes, or uniqueness rules unless the behavior is explicitly global.

## Authentication and Authorization
- Authentication uses JWT.
- Authorization uses Casbin RBAC.
- Authorization policies live in `backend/policies/`.
- Auth concerns are handled at the HTTP boundary; `app/` and `domain/` must remain transport-agnostic and auth-mechanism-agnostic.

## HTTP API
- Endpoints must follow RESTful conventions.
- Prefer resource-oriented URLs, semantic HTTP verbs, correct status codes, and predictable request/response shapes.
- The HTTP contract source of truth is `backend/api/openapi.yml`.
- Errors must follow Problem Details (RFC 7807).
- When changing the API contract, update the OpenAPI spec first and then regenerate derived artifacts.
- Resource creation (`POST`) must return `201` with a `Location` header pointing to the new resource.
- `DELETE` must be idempotent: return `204` even when the resource is already removed (do not return `404` on repeated deletes).

## TDD and Quality
- TDD is the default approach.
- For behavioral changes, start with a failing automated test, implement the minimum change to make it pass, and then refactor.
- Every relevant behavior change should be covered by automated tests close to the changed code.
- Prefer unit tests first. Add integration tests only for behavior that depends on real boundaries such as SQL/migrations/transactions or router/middleware/JWT/Casbin wiring.
- Each non-trivial source file has its own `_test.go` alongside it; a missing pair is a gap worth filling.
- Aim for engineering excellence: correctness, simplicity, consistency, clear boundaries, and maintainability.
- Prefer clean solutions aligned with project references over ad hoc fixes or workaround-driven designs.

## Generated Code and Source of Truth
- Do not manually edit generated code.
- After changing `backend/api/openapi.yml`, run `make api-types`.
- Edit SQL in `backend/internal/infra/postgres/queries/*.sql`.
- After changing SQL queries or migrations, run `make sqlc-gen`.

## Verification
- Prefer `make test-backend-unit` for fast backend feedback and `make test-backend-integration` when changing SQL, migrations, transactions, or HTTP/auth wiring.
- Backend integration tests use the `integration` build tag.
- Prefer `make test`, `make lint`, and `make build` before wrapping up broader changes.

## Additional Context
- Use `README.md` and `docs/adr/` for deeper context and historical decisions.
- If this file conflicts with the observed codebase, follow the codebase and surface the discrepancy.
