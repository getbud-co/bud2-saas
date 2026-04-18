# ADR-005: Autenticação com JWT Stateless

**Data**: 2026-03-24
**Status**: Aceito

## Contexto

O sistema precisa de autenticação. As opções principais são JWT stateless ou sessão server-side (ex: Redis). A escolha impacta o middleware do chi, a posição da verificação de identidade nas camadas, e a escalabilidade horizontal.

## Decisão

Adotar **JWT stateless**:

- Token gerado no login, assinado com chave secreta (HMAC-SHA256 ou RS256).
- Validação feita via middleware chi sem consulta ao banco.
- Claims do token (user ID, roles) disponíveis no `context.Context` para as camadas internas.
- Refresh token armazenado em cookie HttpOnly para renovação segura.

### Posição nas camadas

- **Middleware chi** (handler/): valida assinatura e expiração do JWT, injeta claims no contexto.
- **Handler**: extrai claims do contexto para montar o Command do use case.
- **Use case**: recebe user ID como parte do Command — nunca acessa token diretamente.
- **Domain**: agnóstico a autenticação.

```go
// Middleware injeta no contexto
ctx = context.WithValue(ctx, ctxKeyUserID, claims.UserID)

// Handler extrai do contexto
userID := r.Context().Value(ctxKeyUserID).(string)
```

## Consequências

**Positivas:**
- Stateless — escala horizontalmente sem sessão compartilhada.
- Sem consulta ao banco na validação — latência mínima.
- Middleware chi reutilizável por route group.

**Negativas:**
- Revogação de token requer blacklist (Redis) ou tokens de curta duração — aceito por ora com expiração curta (15min access + refresh token).

## Alternativas Consideradas

- **Sessão com Redis**: Descartado — adiciona dependência de infraestrutura e estado compartilhado sem benefício proporcional para o estágio atual.

## Referências

- github.com/golang-jwt/jwt (biblioteca padrão do ecossistema Go para JWT)
