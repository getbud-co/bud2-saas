# ADR-012 — Contrato de Propagação de TenantID

**Status**: Aceito  
**Data**: 2026-03-25  
**Contexto**: Preparação para sprint de autenticação JWT (ADR-005)

---

## Contexto

O sistema é SaaS multi-tenant com row-level isolation (ADR-011). Cada bounded context além de `organizations` (que é a tabela raiz de tenants) exigirá `tenant_id` em todas as operações. Este ADR define o contrato de como o `TenantID` flui desde o JWT até o banco de dados, garantindo consistência antes da implementação do middleware de autenticação.

## Decisão

### 1. Value Object no domínio

`TenantID` é um named value object em `internal/domain/`:

```go
type TenantID uuid.UUID

func (t TenantID) String() string { return uuid.UUID(t).String() }
```

Use cases e repositórios usam `domain.TenantID`, nunca `uuid.UUID` diretamente para esse campo. Isso torna o contrato explícito e evita confusão com outros UUIDs.

### 2. Extração no middleware de autenticação

O middleware JWT (a ser implementado em `internal/handler/middleware/`) extrai o claim `tenant_id` do token e injeta no `context.Context`:

```go
const tenantIDKey contextKey = "tenant_id"

func TenantFromContext(ctx context.Context) (domain.TenantID, error) {
    v, ok := ctx.Value(tenantIDKey).(domain.TenantID)
    if !ok {
        return domain.TenantID{}, errors.New("tenant_id not found in context")
    }
    return v, nil
}
```

### 3. Propagação via Command

O handler extrai o `TenantID` do context e o inclui explicitamente no Command:

```go
tenantID, err := middleware.TenantFromContext(r.Context())
if err != nil {
    writeProblem(w, http.StatusUnauthorized, "Unauthorized", "missing tenant")
    return
}

cmd := someuc.CreateCommand{
    TenantID: tenantID,  // sempre explícito
    // ... outros campos
}
```

**Regra**: O `TenantID` NUNCA é lido do context dentro de use cases ou repositórios. Ele sempre chega via Command. Use cases são agnósticos a auth.

### 4. Repositório filtra por TenantID

O repositório propaga o `TenantID` para todos os parâmetros sqlc:

```go
func (r *SomeRepository) List(ctx context.Context, filter domain.SomeListFilter) (...) {
    rows, err := r.q.ListSomething(ctx, ListSomethingParams{
        TenantID: uuid.UUID(filter.TenantID),
        // ...
    })
}
```

### 5. Queries sqlc sempre com WHERE tenant_id = $1

Toda query de bounded context (exceto `organizations`) deve incluir `WHERE tenant_id = $1` como primeiro filtro:

```sql
-- name: ListSomething :many
SELECT * FROM something
WHERE tenant_id = $1
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;
```

### 6. organizations não tem tenant_id

A tabela `organizations` é a raiz de tenants — não tem `tenant_id` próprio. Operações em `organizations` não seguem este contrato (são globais ou autorizadas por outro mecanismo, ex: admin token).

---

## Consequências

- Use cases recebem `TenantID` como campo no Command — testáveis sem context ou middleware
- Repositórios nunca acessam context para auth — responsabilidade única
- Qualquer query que esquecer o `WHERE tenant_id = $1` é capturada na revisão de código (padrão visível no SQL)
- RLS no banco como segunda linha de defesa (ADR-011)

## Alternativas rejeitadas

- **TenantID lido do context no use case**: acoplamento com camada de transporte, dificulta testes
- **TenantID injetado no repositório via construtor**: impede compartilhamento de repositório entre tenants em operações administrativas
