# bud2

SaaS multi-tenant — monorepo com backend em Go e frontend em Next.js.

Este documento é o ponto de entrada para novos desenvolvedores. O objetivo é construir um modelo mental sólido da arquitetura antes de tocar em código.

---

## Sumário

1. [Início rápido](#início-rápido)
2. [Estrutura do repositório](#estrutura-do-repositório)
3. [A teoria por trás da arquitetura](#a-teoria-por-trás-da-arquitetura)
4. [As quatro camadas](#as-quatro-camadas)
   - [Domain](#1-domain)
   - [App](#2-app)
   - [API](#3-api)
   - [Infra](#4-infra)
5. [O fluxo de uma requisição](#o-fluxo-de-uma-requisição)
6. [Multi-tenancy](#multi-tenancy)
7. [Padrões recorrentes](#padrões-recorrentes)
8. [Fluxo de desenvolvimento](#fluxo-de-desenvolvimento)
9. [Referências](#referências)

---

## Início rápido

**Pré-requisitos:** Go 1.22+, Node.js 20+, Docker, `make`.

```bash
# 1. Copie as variáveis de ambiente
cp backend/.env.example backend/.env

# 2. Suba o banco e rode backend + frontend
make dev            # hot-reload local (Go + yarn dev)
# ou
make compose-up     # tudo via Docker Compose

# 3. Rode as migrations
make migrate-up

# 4. Verifique saúde
curl http://localhost:8080/health/ready
```

| Serviço  | Endereço              |
|----------|-----------------------|
| Backend  | http://localhost:8080 |
| Frontend | http://localhost:3000 |
| Banco    | localhost:5432        |

---

## Estrutura do repositório

```
bud2/
├── backend/
│   ├── cmd/api/            # Entrypoint — composition root (main.go)
│   ├── internal/
│   │   ├── api/            # Camada HTTP: handlers, middlewares, DTOs
│   │   ├── app/            # Casos de uso (application services)
│   │   ├── domain/         # Entidades, value objects, interfaces de repositório
│   │   └── infra/          # Implementações concretas (postgres, jwt, casbin)
│   ├── api/openapi.yml     # Contrato da API (source of truth)
│   ├── migrations/         # Migrations SQL (golang-migrate)
│   └── sqlc.yml            # Configuração de geração de código SQL
├── frontend/
│   └── src/
│       ├── app/            # App Router (Next.js 15)
│       ├── components/     # Componentes React
│       ├── lib/
│       │   ├── api.ts      # Cliente HTTP para o backend
│       │   └── types.ts    # Tipos gerados do OpenAPI spec
│       └── hooks/
├── docs/                   # ADRs (Architecture Decision Records)
├── compose.yml
└── Makefile
```

---

## A teoria por trás da arquitetura

### Por que camadas?

Todo software enfrenta a mesma tensão: **lógica de negócio** (o que o sistema faz) vs. **detalhes de implementação** (como ele faz — banco de dados, HTTP, autenticação). Quando esses dois mundos se misturam, o resultado é código difícil de testar, difícil de mudar e frágil.

A arquitetura do bud2 é inspirada nos princípios de **Clean Architecture** (Robert C. Martin): as regras de negócio ficam no centro, e os detalhes técnicos ficam na periferia. O fluxo de dependência aponta sempre para dentro — nunca para fora.

### A regra fundamental de dependência

```
api/ → app/ → domain/ ← infra/
```

- `domain/` não conhece nada além de si mesmo — zero dependências externas.
- `app/` conhece `domain/`, mas não sabe nada sobre HTTP ou banco de dados.
- `api/` conhece `app/` e `domain/`, mas não importa `infra/` diretamente.
- `infra/` implementa as interfaces definidas em `domain/` e conhece todos os detalhes técnicos.

```
┌─────────────────────────────────────────────┐
│  cmd/api/main.go  (composition root)        │
│  Monta todas as dependências e inicia        │
└──────────────────┬──────────────────────────┘
                   │ injeta
        ┌──────────▼──────────┐
        │      api/           │  ← HTTP: parseia requests,
        │   (handlers)        │    chama casos de uso,
        └──────────┬──────────┘    formata responses
                   │ chama
        ┌──────────▼──────────┐
        │      app/           │  ← Casos de uso: orquestra
        │  (use cases)        │    regras de negócio
        └──────────┬──────────┘
                   │ usa interfaces de
        ┌──────────▼──────────┐
        │     domain/         │  ← Entidades, value objects,
        │  (entities +        │    interfaces de repositório
        │   interfaces)       │    Lógica de negócio pura
        └──────────▲──────────┘
                   │ implementa
        ┌──────────┴──────────┐
        │      infra/         │  ← Postgres, JWT, Casbin
        │  (implementations)  │    Detalhes técnicos concretos
        └─────────────────────┘
```

### Por que isso importa na prática?

| Cenário | Sem separação | Com separação |
|---------|---------------|---------------|
| Trocar banco de dados | Reescrever metade do código | Trocar apenas `infra/postgres/` |
| Testar lógica de negócio | Precisa de banco real | Mock simples da interface |
| Adicionar novo endpoint | Risco de contaminar lógica de negócio | Handler isolado, use case inalterado |
| Entender o que o sistema faz | Lê SQL misturado com regras | Lê `domain/` e `app/` apenas |

---

## As quatro camadas

### 1. Domain

**O que é:** O coração do sistema. Contém entidades, value objects e as interfaces que o resto do código precisa implementar. Não tem nenhuma dependência de framework, banco de dados ou protocolo HTTP.

**Responsabilidades:**
- Definir entidades com seus invariantes (`User`, `Organization`, `Membership`)
- Definir value objects (`TenantID`)
- Declarar interfaces de repositório (contrato sem implementação)
- Definir erros de domínio (`ErrNotFound`, `ErrValidation`)

**Exemplo — entidade User** (`backend/internal/domain/user/user.go`):

```go
type User struct {
    ID           uuid.UUID
    Name         string
    Email        string
    PasswordHash string
    Status       Status   // "active" | "inactive"
    Memberships  []membership.Membership
    CreatedAt    time.Time
    UpdatedAt    time.Time
}

// Regra de negócio: garante que o usuário pertence à organização
func (u *User) EnsureAccessibleInOrganization(organizationID uuid.UUID) error {
    _, err := u.MembershipForOrganization(organizationID)
    return err
}
```

**Exemplo — interface de repositório** (`backend/internal/domain/user/repository.go`):

```go
type Repository interface {
    Create(ctx context.Context, user *User) (*User, error)
    GetByID(ctx context.Context, id uuid.UUID) (*User, error)
    GetByEmail(ctx context.Context, email string) (*User, error)
    ListByOrganization(ctx context.Context, orgID uuid.UUID, status *Status, page, size int) (ListResult, error)
    Update(ctx context.Context, user *User) (*User, error)
}
```

> **Regra:** `domain/` nunca importa `infra/`, `api/`, ou qualquer biblioteca de banco/HTTP. Se você está importando `pgx` em `domain/`, algo está errado.

---

### 2. App

**O que é:** Os casos de uso da aplicação. Cada caso de uso representa uma ação que o sistema pode realizar (criar usuário, listar organizações, fazer login). Orquestra entidades do domínio, repositórios e serviços externos — tudo via interfaces.

**Responsabilidades:**
- Implementar casos de uso com um método `Execute(ctx, Command) → (result, error)`
- Usar `Command` structs para receber parâmetros
- Aplicar regras de negócio que envolvem múltiplas entidades
- Gerenciar transações via Unit of Work
- Nunca conhecer HTTP, JSON, ou detalhes de banco

**Exemplo — CreateUseCase** (`backend/internal/app/user/create.go`):

```go
type CreateCommand struct {
    OrganizationID domain.TenantID
    Name           string
    Email          string
    Password       string
    Role           string
}

type CreateUseCase struct {
    users          usr.Repository           // Interface — não sabe que é Postgres
    organizations  org.Repository
    txm            tx.Manager
    passwordHasher auth.PasswordHasher      // Interface — não sabe que é bcrypt
    logger         *slog.Logger
}

func (uc *CreateUseCase) Execute(ctx context.Context, cmd CreateCommand) (*usr.User, error) {
    // 1. Valida enum de negócio
    role := membership.Role(cmd.Role)
    if !role.IsValid() {
        return nil, domain.ErrValidation
    }

    // 2. Verifica se usuário já existe
    existingUser, err := uc.users.GetByEmail(ctx, cmd.Email)
    // ...

    // 3. Operação atômica via transação
    err = uc.txm.WithTx(ctx, func(repos tx.Repositories) error {
        // Cria usuário + membership dentro da mesma transação
        return nil
    })
    return targetUser, err
}
```

> **Regra:** `app/` nunca importa `net/http`, `pgx`, ou qualquer DTO de handler. Se precisar de dados do request, receba via `Command`.

---

### 3. API

**O que é:** A camada de transporte HTTP. Sabe tudo sobre requisições e respostas HTTP, mas nada sobre banco de dados ou regras de negócio complexas.

**Responsabilidades:**
- Parsear e validar requisições HTTP (DTOs de entrada)
- Extrair contexto do JWT (TenantID, UserID)
- Traduzir erros de domínio em status HTTP
- Serializar respostas (DTOs de saída)
- Definir middlewares cross-cutting (auth, logging, rate limit)

**Exemplo — handler** (`backend/internal/api/user/handler.go`):

```go
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
    // 1. Contexto de tenant do JWT (injetado pelo middleware)
    organizationID, err := domain.TenantIDFromContext(r.Context())
    if err != nil {
        httputil.WriteProblem(w, http.StatusUnauthorized, "Unauthorized", err.Error())
        return
    }

    // 2. Decode + validate
    var req createRequest
    if !httputil.DecodeJSON(w, r, &req) {
        return
    }
    if err := validator.Validate(req); err != nil {
        httputil.WriteProblem(w, http.StatusUnprocessableEntity, "Validation Error", ...)
        return
    }

    // 3. Chama o caso de uso — handler não sabe o que acontece aqui
    result, err := h.create.Execute(r.Context(), req.toCommand(organizationID))
    if err != nil {
        handleError(w, err)  // mapeia ErrNotFound → 404, ErrValidation → 422
        return
    }

    // 4. Serializa resposta
    httputil.WriteJSON(w, http.StatusCreated, toResponse(result))
}
```

**DTOs são exclusivos desta camada:**

```go
// Request DTO — validação estrutural/formato apenas
type createRequest struct {
    Name     string `json:"name"     validate:"required,min=2,max=100"`
    Email    string `json:"email"    validate:"required,email"`
    Password string `json:"password" validate:"required,min=8"`
    Role     string `json:"role"     validate:"required,oneof=admin manager collaborator"`
}

// Response DTO — entidade de domínio nunca tem json tags
type userResponse struct {
    ID        string `json:"id"`
    Name      string `json:"name"`
    Email     string `json:"email"`
    Status    string `json:"status"`
    CreatedAt string `json:"created_at"`  // RFC3339
}
```

**Stack de middlewares** (aplicado na ordem):

```
CORS → Body Size → Recovery → Trace (OTEL) → Logger
  → Auth (extrai JWT) → Tenant (injeta TenantID no ctx)
    → Timeout → Rate Limit → Handler
```

> **Regra:** Entidades de domínio nunca têm `json:` tags. Serialização é responsabilidade exclusiva dos DTOs em `api/`.

---

### 4. Infra

**O que é:** Implementações concretas de todas as interfaces definidas em `domain/`. Aqui vivem banco de dados, JWT, bcrypt, Casbin. É a única camada que pode importar drivers e bibliotecas externas pesadas.

**Responsabilidades:**
- Implementar `domain/*/repository.go` contra o Postgres via sqlc
- Implementar `domain/auth/password.go` com bcrypt
- Implementar `domain/auth/token.go` com JWT
- Gerenciar transações (`postgres/tx_manager.go`)
- Configurar Casbin para RBAC

**Exemplo — UserRepository** (`backend/internal/infra/postgres/user.go`):

```go
type UserRepository struct {
    q userQuerier  // interface sobre sqlc.Queries — testável
}

func (r *UserRepository) Create(ctx context.Context, u *user.User) (*user.User, error) {
    // 1. Chama query gerada pelo sqlc
    row, err := r.q.CreateUser(ctx, sqlc.CreateUserParams{
        ID:           u.ID,
        Name:         u.Name,
        Email:        u.Email,
        PasswordHash: u.PasswordHash,
        Status:       string(u.Status),
    })
    if err != nil {
        return nil, err
    }

    // 2. Mapeia row do banco → entidade de domínio
    created := createUserRowToDomain(row)

    // 3. Sincroniza memberships (insert em organization_memberships)
    if err := r.syncMemberships(ctx, created); err != nil {
        return nil, err
    }

    return r.GetByID(ctx, created.ID)
}
```

**Geração de código SQL com sqlc:**

```sql
-- backend/internal/infra/postgres/queries/users.sql
-- name: CreateUser :one
INSERT INTO users (id, name, email, password_hash, status, is_system_admin)
VALUES (@id, @name, @email, @password_hash, @status, @is_system_admin)
RETURNING *;
```

O comando `make sqlc-gen` gera o Go tipado correspondente em `infra/postgres/sqlc/`.

> **Regra:** `infra/` é o único lugar que importa `pgx`, `jwt`, `bcrypt`, `casbin`. Se você vê um desses imports em `domain/` ou `app/`, é um vazamento de abstração.

---

## O fluxo de uma requisição

Vamos traçar `POST /users` do início ao fim:

```
Cliente HTTP
    │
    │  POST /users  { name, email, password, role }
    ▼
┌──────────────────────────────────────┐
│  Middleware Stack                    │
│  auth.go: extrai JWT → UserClaims    │
│  tenant.go: TenantID → ctx           │
└──────────────────┬───────────────────┘
                   │
    ▼
┌──────────────────────────────────────┐
│  api/user/handler.go                 │
│  1. TenantIDFromContext(ctx)         │
│  2. DecodeJSON → createRequest       │
│  3. Validate(req)                    │
│  4. req.toCommand(organizationID)    │
└──────────────────┬───────────────────┘
                   │  CreateCommand
    ▼
┌──────────────────────────────────────┐
│  app/user/create.go                  │
│  1. Valida role enum                 │
│  2. GetByEmail → user existe?        │
│  3. GetByDomain → org do domínio?    │
│  4. Hash password                    │
│  5. txm.WithTx() →                   │
│     ├─ users.Create(user)            │
│     └─ memberships.Create(m)         │
└──────────────────┬───────────────────┘
                   │  *user.User
    ▼
┌──────────────────────────────────────┐
│  infra/postgres/user.go              │
│  sqlc.CreateUser(params)             │
│  → INSERT INTO users ...             │
│  syncMemberships()                   │
│  → INSERT INTO organization_memberships
└──────────────────┬───────────────────┘
                   │  *user.User (domínio)
    ▲
┌──────────────────────────────────────┐
│  api/user/handler.go (volta)         │
│  toResponse(result)                  │
│  WriteJSON(w, 201, response)         │
└──────────────────────────────────────┘
    │
    │  201 Created  { id, name, email, status, created_at }
    ▼
Cliente HTTP
```

**Ponto chave:** cada camada faz exatamente uma coisa. O handler não conhece SQL. O caso de uso não sabe que existe HTTP. O repositório não conhece regras de negócio.

---

## Multi-tenancy

O bud2 implementa **row-level isolation**: um único banco compartilhado, com `tenant_id` em todas as tabelas de negócio. Cada tenant é uma organização.

### Como o tenant_id flui

```
JWT (active_organization_id claim)
    │
    │ middleware/tenant.go
    ▼
context.Context  ←  TenantID (value object tipado, não string raw)
    │
    │ handler extrai com domain.TenantIDFromContext(ctx)
    ▼
CreateCommand.OrganizationID = tenantID
    │
    │ use case passa para repositório
    ▼
sqlc query:  WHERE organization_id = $1
```

### Por que TenantID é um value object?

```go
// domain/tenant.go
type TenantID struct { id uuid.UUID }

func TenantIDFromContext(ctx context.Context) (TenantID, error) { ... }
func (t TenantID) UUID() uuid.UUID                              { return t.id }
```

Usar `TenantID` no lugar de `uuid.UUID` puro garante que o compilador detecte se você esqueceu de passar o tenant. Um `uuid.UUID` genérico pode ser qualquer coisa; um `TenantID` só pode vir do contexto autenticado.

### Defesas em camadas

| Camada | Mecanismo |
|--------|-----------|
| Middleware | Extrai `organization_id` do JWT validado |
| Domínio | `EnsureAccessibleInOrganization()` valida pertencimento |
| Repositório | `WHERE tenant_id = $1` em todas as queries |
| Banco | RLS (Row Level Security) como segunda linha de defesa |

---

## Padrões recorrentes

### Repository Pattern

O domínio define a interface; a infra implementa. Isso permite testar casos de uso com mocks sem banco de dados real.

```go
// domain define o contrato
type Repository interface {
    GetByID(ctx context.Context, id uuid.UUID) (*User, error)
}

// infra implementa
type UserRepository struct{ q userQuerier }
func (r *UserRepository) GetByID(...) (*User, error) { ... }

// teste usa mock
type mockUserRepo struct{ mock.Mock }
func (m *mockUserRepo) GetByID(...) (*User, error) { return m.Called(...).Get(0).(*User), ... }
```

### Unit of Work

Quando múltiplos repositórios precisam participar da mesma transação:

```go
// app/tx/manager.go
type Manager interface {
    WithTx(ctx context.Context, fn func(Repositories) error) error
}

type Repositories interface {
    Users()         user.Repository
    Organizations() organization.Repository
}
```

Uso em casos de uso:
```go
err = uc.txm.WithTx(ctx, func(repos tx.Repositories) error {
    if _, err := repos.Users().Create(ctx, newUser); err != nil {
        return err  // rollback automático
    }
    return nil  // commit automático
})
```

### Command Pattern

Cada caso de uso recebe um `Command` struct. Isso torna as assinaturas estáveis — adicionar um campo não quebra chamadores existentes — e torna os testes declarativos.

```go
type CreateCommand struct {
    OrganizationID domain.TenantID
    Name           string
    Email          string
    Password       string
    Role           string
}
```

### Composition Root

Todo o grafo de dependências é montado em um único lugar: `cmd/api/main.go`. Nenhuma dependência é construída dentro de use cases ou handlers. Isso garante que trocar uma implementação (ex: substituir Postgres por outra coisa) exige mudança em apenas um arquivo.

```go
// main.go — injeta tudo explicitamente
userRepo     := postgres.NewUserRepository(queries)
passwordHasher := auth.NewDefaultBcryptPasswordHasher()
createUser   := appuser.NewCreateUseCase(userRepo, orgRepo, txm, passwordHasher, logger)
userHandler  := apiuser.NewHandler(createUser, getUser, listUser, ...)
```

### Contrato da API (OpenAPI first)

`backend/api/openapi.yml` é a source of truth para o contrato HTTP. Os tipos TypeScript do frontend são gerados a partir dele:

```bash
make api-types   # openapi.yml → frontend/src/lib/types.ts
```

Erros seguem RFC 7807 (Problem Details):
```json
{
  "type": "about:blank",
  "title": "Validation Error",
  "status": 422,
  "detail": "email: must be a valid email address"
}
```

### Soft Delete

Nenhum registro é deletado fisicamente. Todas as tabelas têm `deleted_at`:

```sql
-- queries sempre filtram
WHERE deleted_at IS NULL

-- deleção seta o timestamp
UPDATE users SET deleted_at = NOW() WHERE id = $1
```

### Paginação

Todos os endpoints de listagem aceitam `page` e `size`:

```
GET /users?page=2&size=50
```

Padrão: `page=1`, `size=20`. Máximo: `size=100`.

---

## Fluxo de desenvolvimento

### Adicionando uma feature

O fluxo natural ao adicionar algo novo:

```
1. openapi.yml       → define o contrato HTTP
2. domain/           → entidade ou interface nova se necessário
3. migrations/       → migration SQL se precisar de nova tabela/coluna
4. make sqlc-gen     → gera código Go das queries
5. infra/postgres/   → implementa repositório
6. app/              → implementa caso de uso
7. api/              → implementa handler, DTOs, mapeamento de erros
8. cmd/api/main.go   → cabeou as dependências
9. make api-types    → atualiza tipos TypeScript do frontend
```

### Comandos principais

| Comando | O que faz |
|---------|-----------|
| `make dev` | Inicia backend + frontend com hot-reload |
| `make compose-up` | Sobe tudo via Docker Compose |
| `make test` | Roda testes do backend e lint do frontend |
| `make lint` | golangci-lint + yarn lint |
| `make migrate-up` | Aplica migrations pendentes |
| `make sqlc-gen` | Gera código Go a partir das queries SQL |
| `make api-types` | Gera tipos TypeScript a partir do OpenAPI spec |

### Adicionando uma migration

```bash
# Formato: NNNNNN_descricao.up.sql e NNNNNN_descricao.down.sql
touch backend/migrations/000013_add_column_x.up.sql
touch backend/migrations/000013_add_column_x.down.sql
make migrate-up
make sqlc-gen   # se adicionou/alterou queries
```

### Adicionando uma query SQL

1. Edite ou crie um arquivo em `backend/internal/infra/postgres/queries/*.sql`
2. Siga a anotação sqlc: `-- name: QueryName :one/:many/:exec`
3. Rode `make sqlc-gen`
4. Use a query gerada em `infra/postgres/sqlc/` dentro do repositório

---

## Referências

- `docs/` — ADRs com decisões arquiteturais importantes (ex: estratégia de multi-tenancy, soft delete)
- `backend/api/openapi.yml` — contrato completo da API
- `backend/policies/` — modelo RBAC do Casbin (admin / manager / collaborator)
- `backend/internal/test/` — fixtures e helpers de teste
- [Clean Architecture — Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [golang-migrate](https://github.com/golang-migrate/migrate)
- [sqlc](https://sqlc.dev/)
- [chi router](https://github.com/go-chi/chi)
