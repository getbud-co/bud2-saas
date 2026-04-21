# ADR-012: Propagação de Escopo de Organização

**Status**: Aceito
**Data**: 2026-03-25

## Contexto

O backend precisa propagar dois tipos de informação de acesso a partir do JWT:

- identidade/autorização do usuário
- tenant ativo quando a operação depende de uma organização selecionada

Além disso, `organizations` tem regras próprias de visibilidade por membership e não deve depender do tenant ativo para listagem, leitura ou atualização.

## Decisão

### 1. Claims sempre no contexto HTTP

O middleware JWT injeta `domain.UserClaims` no contexto para toda rota autenticada.

### 2. Tenant ativo é opcional

Quando o token possui `active_organization_id`, o middleware também injeta `domain.TenantID` no contexto.

### 3. Handlers convertem contexto em comando explícito

- Endpoints tenant-scoped extraem `TenantID` e o passam para o comando.
- Endpoints de `organizations` extraem `UserClaims` e passam o ator explicitamente para o use case.

### 4. Use cases não leem contexto para autorização

Depois do handler, o escopo segue por parâmetros e comandos explícitos.

### 5. Regras para `organizations`

- `GET /organizations`: lista por membership; `system admin` lista globalmente.
- `GET /organizations/{id}` e `PUT /organizations/{id}`: acesso por membership; `system admin` acessa globalmente.
- `POST /organizations`: somente `system admin`.

## Consequências

- O boundary HTTP continua responsável por auth e tradução de contexto.
- Casos de uso seguem testáveis sem dependência de middleware.
- O sistema não força `TenantID` em operações que são orientadas por membership em vez de tenant ativo.
