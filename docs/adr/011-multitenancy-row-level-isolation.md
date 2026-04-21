# ADR-011: Multi-Tenancy por Organization e Memberships

**Data**: 2026-03-24
**Status**: Aceito

## Contexto

O bud2 é um SaaS multi-tenant. O tenant funcional é `Organization`. O sistema precisa restringir acesso por organização sem espalhar regra de autorização em handlers e sem afirmar um modelo de `tenant_id` que o schema atual não implementa.

## Decisão

Adotar o modelo atual de multi-tenancy com estas regras:

- `organizations` é a raiz de tenant.
- Usuários pertencem a organizações via `organization_memberships`.
- O JWT pode carregar uma `active_organization_id` para operações escopadas à organização ativa.
- Endpoints como `/users` operam no tenant ativo.
- Endpoints de `/organizations` usam memberships para definir visibilidade:
  - usuário comum vê apenas organizações às quais pertence
  - `system admin` vê todas as organizações

## Como o isolamento acontece hoje

- Escopo ativo é propagado no contexto quando o JWT possui `active_organization_id`.
- Casos de uso tenant-scoped recebem `domain.TenantID` explicitamente.
- Acesso a organizações é filtrado por join em `organization_memberships`.
- `system admin` é a única exceção com visibilidade global.

## Consequências

**Positivas:**
- O modelo implementado fica explícito e auditável.
- O sistema separa bem operações por tenant ativo e operações de catálogo de organizações.
- A regra de acesso para organizações fica consistente com sessões e memberships.

**Negativas:**
- O projeto não usa `tenant_id` universal em todas as tabelas.
- O isolamento depende de disciplina no uso correto de memberships e escopo ativo.

## Alternativas Consideradas

- `tenant_id` explícito em todas as tabelas: não corresponde ao schema atual.
- Visibilidade global de organizações para qualquer usuário com permissão: descartada por vazar tenants sem necessidade.
