# ADR-003: Handlers HTTP e Casos de Uso

**Data**: 2026-03-24
**Status**: Aceito

## Decisão

Handlers HTTP:

- decodificam request
- validam estrutura
- extraem claims/tenant do contexto quando necessário
- constroem comandos explícitos
- chamam casos de uso
- mapeiam resultado e erro para HTTP

Casos de uso:

- vivem em `internal/app/`
- recebem comandos explícitos ou poucos parâmetros primitivos
- não conhecem `net/http`
- retornam entidades de domínio ou resultados de aplicação

## Consequências

- A autorização continua no boundary HTTP, mas o escopo necessário segue explicitamente para `app/`.
- DTOs permanecem exclusivos da camada `api/`.
- O domínio não recebe dependência de transporte.
