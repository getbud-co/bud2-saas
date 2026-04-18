# ADR-011: Estratégia de Multi-Tenancy — Row-Level Isolation com tenant_id

**Data**: 2026-03-24
**Status**: Aceito

---

## Contexto

O bud2 é um SaaS multi-tenant. Antes de qualquer implementação de entidades de negócio ou endpoints protegidos, é necessário definir como os dados de tenants distintos serão isolados no banco de dados e como o identificador de tenant fluirá pelas camadas da aplicação.

As três abordagens clássicas para isolamento em PostgreSQL são:

1. **Database isolation**: cada tenant possui seu próprio banco PostgreSQL.
2. **Schema isolation**: cada tenant possui seu próprio PostgreSQL schema (`tenant_abc.users`).
3. **Row-level isolation**: schema único e compartilhado; todas as tabelas de negócio possuem coluna `tenant_id`; isolamento por cláusula `WHERE tenant_id = $1`.

O projeto utiliza sqlc para acesso a dados (geração de código a partir de SQL explícito), golang-migrate para versionamento de schema, chi como router HTTP, e JWT stateless com `tenant_id` nos claims.

---

## Decisão

Adotar **row-level isolation com `tenant_id` explícito em todas as queries** como mecanismo primário de isolamento, complementado por **Row-Level Security (RLS) do PostgreSQL** como rede de segurança em tabelas críticas.

---

## Justificativa Detalhada

### Por que descartar schema isolation

O sqlc gera código Go em tempo de build contra um schema estático. Com schema isolation, o nome qualificado da tabela (`tenant_abc.users`) varia por tenant — o que exigiria geração de código por schema ou SET search_path dinâmico por conexão. O sqlc não suporta nenhum dos dois modelos sem tooling customizado. A ergonomia central da ferramenta — queries SQL visíveis e tipadas — seria destruída.

### Por que descartar database isolation

Cada banco PostgreSQL implica uma instância separada de connection pool, pipeline de migration, rotina de backup e configuração de monitoring. Para um SaaS em estágio inicial, o custo operacional é desproporcional ao benefício. Esta abordagem só se justifica quando regulação exige isolamento físico de dados (segmento de saúde, financeiro com compliance tier alto).

### Por que row-level isolation é a escolha certa

- **Ergonomia máxima com sqlc**: o parâmetro `tenant_id` aparece explicitamente em cada query SQL, e o sqlc gera um struct de parâmetros tipado que inclui `TenantID`. O compilador Go garante que nenhuma query tenant-scoped pode ser chamada sem fornecer o tenant — enforcement em tempo de compilação.
- **Migrations globais**: uma única sequência numerada de migrations afeta o schema compartilhado. Onboarding de novo tenant é um `INSERT` na tabela `tenants`, não DDL.
- **Alinhamento com Clean Architecture**: o `tenant_id` transita como valor explícito pelas camadas, sem dependência de mecanismo de sessão ou contexto implícito. Testabilidade preservada.

---

## Fluxo do tenant_id pelas camadas

```
JWT claim (tenant_id)
  → middleware (internal/handler/middleware/) extrai e valida
    → ctx.WithValue(tenantContextKey, tenantID)
      → handler: TenantFromContext(ctx) → domain.TenantID
        → handler: Command{TenantID: tenantID, ...}
          → usecase.Execute(ctx, cmd)
            → repo.Method(ctx, tenantID, ...)
              → sqlc query: WHERE tenant_id = $1
```

**Propriedades invariantes:**

1. O `tenant_id` é extraído do context exatamente uma vez, na camada handler, pela função `TenantFromContext`.
2. A partir do handler, o `tenant_id` transita como valor explícito no Command e nos parâmetros do Repository — nunca é extraído do context novamente em camadas internas.
3. Use cases e domain não possuem dependência de `net/http` nem de mecanismo de autenticação.
4. O context é usado exclusivamente para propagação de cancelamento e deadlines (`context.Context` como primeiro parâmetro, sem leitura de valores tenant dentro de use case ou infra).

---

## Estrutura de tipos no domínio

O `TenantID` é um Value Object definido em `internal/domain/`. Não é um alias de `string` nem de `uuid.UUID` nu — é um tipo nomeado. Isso previne passagem acidental de IDs de tipos distintos onde um `TenantID` é esperado.

A interface de Repository, definida em `internal/domain/`, inclui `TenantID` como parâmetro obrigatório em todos os métodos que acessam dados tenant-scoped. A ausência do parâmetro na interface é um bug de design detectável em code review antes de chegar à implementação.

---

## Convenções de banco de dados

### Tabela de tenants

Existe uma tabela `tenants` sem coluna `tenant_id` — ela é o root de isolamento. Contém no mínimo `id UUID PRIMARY KEY`, `slug TEXT UNIQUE NOT NULL`, `created_at TIMESTAMPTZ NOT NULL`.

### Toda tabela de negócio

Toda tabela que armazena dados de tenant recebe:
- `tenant_id UUID NOT NULL REFERENCES tenants(id)`
- Índice composto com `tenant_id` como primeira coluna: `CREATE INDEX ON tabela (tenant_id, id)` ou `CREATE INDEX ON tabela (tenant_id, campo_de_busca)`. A ordem é obrigatória para eficiência — queries filtram primeiro por tenant, depois por critério de negócio.

### Constraint de unicidade

Unicidade de negócio dentro de um tenant é expressa como `UNIQUE (tenant_id, campo_unico)`, não `UNIQUE (campo_unico)`.

---

## Row-Level Security como rede de segurança

O RLS do PostgreSQL é configurado como segunda linha de defesa em tabelas críticas (dados financeiros, dados pessoais, contratos). Não substitui o `WHERE tenant_id = $1` nas queries — complementa.

A implementação envolve:
1. `ALTER TABLE tabela_critica ENABLE ROW LEVEL SECURITY`
2. `CREATE POLICY tenant_isolation ON tabela_critica USING (tenant_id = current_setting('app.current_tenant_id')::uuid)`
3. Na camada infra, antes de queries em transação dentro de tabelas com RLS: `SET LOCAL app.current_tenant_id = '<tenant_id>'`

Trade-off: o `SET LOCAL` exige contexto de transação e adiciona um round-trip. Por isso, RLS é aplicado seletivamente em tabelas de maior risco, não globalmente. O mecanismo primário de isolamento permanece sendo o `WHERE tenant_id = $1` explícito.

---

## Impacto nas migrations

- Migrations continuam globais — um único pipeline de golang-migrate, uma única sequência numerada.
- A primeira migration cria a tabela `tenants`.
- Cada migration subsequente que adiciona tabela de negócio inclui a coluna `tenant_id` e o índice composto correspondente.
- Migrations de RLS (CREATE POLICY, ENABLE ROW LEVEL SECURITY) são migrations normais do golang-migrate, sem tratamento especial.
- Não existe migration "por tenant". Onboarding de tenant é lógica de aplicação (INSERT em `tenants`), não DDL.

---

## Consequências

**Positivas:**
- Ergonomia total com sqlc: parâmetros tenant-scoped são tipados e obrigatórios em tempo de compilação.
- Operação simples: uma base de dados, um pipeline de migration, connection pool único.
- Testabilidade preservada: use cases recebem `TenantID` pelo Command, sem dependência de middleware.
- Isolamento auditável: o `WHERE tenant_id = $1` é visível em cada arquivo `.sql` versionado no repositório.

**Negativas:**
- Disciplina de código necessária: todo desenvolvedor deve incluir `tenant_id` em queries e interfaces de Repository. Não é automático.
- Performance compartilhada: um tenant com volume anormalmente alto afeta queries de outros tenants na mesma tabela. Mitigado por índices compostos e, futuramente, por particionamento por `tenant_id` se necessário.
- Migração futura para schema isolation é custosa se o volume de tenants crescer ao ponto de exigir isolamento físico.

**Neutras:**
- O número de tenants não afeta a complexidade operacional (cada novo tenant é apenas uma linha na tabela `tenants`).

---

## Alternativas Consideradas

**Schema isolation**: descartada. Incompatível com a ergonomia do sqlc e requer tooling customizado para migrations. Complexidade desproporcional para estágio inicial.

**Database isolation**: descartada. Custo operacional (connection pools, backups, monitoring) desproporcional para SaaS em estágio inicial. Só justificável por exigência regulatória.

---

## Referências

- Martin, Robert C. *Clean Architecture: A Craftsman's Guide to Software Structure and Design*. Prentice Hall, 2017. — Capítulo sobre independência de mecanismos de entrega e persistência.
- Evans, Eric. *Domain-Driven Design: Tackling Complexity in the Heart of Software*. Addison-Wesley, 2003. — Value Objects como tipos nomeados com identidade semântica.
- PostgreSQL Documentation. *Row Security Policies*. https://www.postgresql.org/docs/18/ddl-rowsecurity.html
- sqlc Documentation. *Generating code from SQL*. https://docs.sqlc.dev/
- Gormley, Rob. *Multi-Tenant SaaS with PostgreSQL*. Padrão da indústria documentado em Citus/PostgreSQL blogs — row-level isolation como default para SaaS early-stage.
