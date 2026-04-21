# ADR-001: Monorepo com Backend Go e Frontend React + Vite

**Data**: 2026-03-24
**Status**: Aceito

## Contexto

O bud2 mantém backend e frontend no mesmo repositório. A estrutura precisa permitir evolução coordenada do contrato HTTP sem acoplar o tooling das duas aplicações.

## Decisão

Adotar um monorepo com dois workspaces principais:

- `backend/`: API em Go, com módulo Go próprio
- `frontend/`: aplicação React + Vite, com `package.json` próprio

O compartilhamento entre backend e frontend acontece via HTTP e OpenAPI. Tipos TypeScript do frontend são gerados a partir de `backend/api/openapi.yml`.

## Consequências

**Positivas:**
- Mudanças de contrato e implementação ficam versionadas juntas.
- O backend e o frontend continuam com toolchains independentes.
- O contrato HTTP pode ser validado e regenerado dentro do mesmo repositório.

**Negativas:**
- Não existe compartilhamento direto de tipos entre Go e TypeScript fora do contrato OpenAPI.

## Alternativas Consideradas

- Repositórios separados: descartado pela fricção para evoluir contrato e implementação.
- Monorepo com toolchain unificado: descartado por adicionar complexidade sem necessidade.
