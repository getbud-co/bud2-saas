# ADR-009: OpenAPI como Fonte da Verdade do Contrato HTTP

**Data**: 2026-03-24
**Status**: Aceito

## Contexto

O frontend depende de um contrato HTTP estável e o backend implementa os handlers manualmente. Sem uma fonte de verdade única, o drift entre contrato e implementação aparece rápido.

## Decisão

`backend/api/openapi.yml` é a fonte da verdade do contrato HTTP.

- Os handlers Go são implementados manualmente a partir da spec.
- Os tipos TypeScript são gerados para `frontend/src/lib/types.ts`.
- Alterações de contrato devem atualizar a spec antes ou junto da implementação.

## Convenções

- Endpoints seguem convenções REST compatíveis com a implementação atual.
- Erros usam Problem Details (`application/problem+json`).
- Regras de autorização e escopo relevantes para o cliente devem estar descritas na spec.
- A spec deve refletir o comportamento implementado, inclusive `401`, `403`, `404`, `409` e `422` quando aplicável.

## Consequências

**Positivas:**
- Backend e frontend compartilham um contrato verificável.
- O contrato documenta não só shape, mas também regras visíveis ao cliente.

**Negativas:**
- A spec precisa ser mantida junto com o código.

## Alternativas Consideradas

- Tipos TypeScript escritos à mão: descartado por drift silencioso.
- Code-first a partir do Go: descartado para manter controle explícito do contrato.
