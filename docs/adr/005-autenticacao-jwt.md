# ADR-005: Autenticação com JWT e Refresh Token Persistido

**Data**: 2026-03-24
**Status**: Aceito

## Contexto

O backend precisa autenticar chamadas HTTP sem introduzir sessão server-side compartilhada. Também precisa permitir renovação controlada do access token.

## Decisão

Adotar autenticação com:

- access token JWT assinado com HMAC
- validação do JWT no middleware HTTP
- refresh token opaco persistido no banco
- renovação de sessão via payload JSON, não cookie

Os claims relevantes do access token são:

- `user_id`
- `active_organization_id` opcional
- `membership_role`
- `is_system_admin`

## Posição nas camadas

- `api/middleware/auth.go` valida o token e injeta `domain.UserClaims` no contexto.
- Quando o token possui `active_organization_id`, o middleware também injeta `domain.TenantID` no contexto.
- Handlers extraem claims e tenant quando necessário e os convertem em comandos explícitos.
- Use cases e domínio permanecem agnósticos a JWT.

## Consequências

**Positivas:**
- Validação rápida no boundary HTTP.
- Claims suficientes para RBAC e escopo de organização sem consulta imediata ao banco.
- Refresh token pode ser revogado e rotacionado com persistência real.

**Negativas:**
- O contrato entre emissor e middleware precisa permanecer alinhado.
- Sessão e escopo ativo dependem da consistência entre memberships, organização ativa e refresh flow.

## Alternativas Consideradas

- Sessão server-side com Redis: descartada pelo custo operacional adicional.
- Refresh token em cookie HttpOnly: não adotado na implementação atual.
