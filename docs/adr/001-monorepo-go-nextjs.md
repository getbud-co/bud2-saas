# ADR-001: Estrutura de Monorepo com Backend Go e Frontend Next.js

**Data**: 2026-03-24
**Status**: Aceito

## Contexto

O projeto bud2 precisa hospedar um backend de API e um frontend web no mesmo repositório. A equipe precisa de uma estrutura clara que permita o desenvolvimento independente de cada serviço sem fricção desnecessária de tooling.

## Decisão

Adotar um monorepo com separação física por diretório raiz (`backend/` para Go, `frontend/` para Next.js), com módulo Go independente (`go.mod` próprio) e `package.json` independente. Os dois serviços não compartilham código em tempo de build — a comunicação é exclusivamente via HTTP.

## Consequências

**Positivas:**
- Versionamento unificado, facilita mudanças que afetam ambas as camadas simultaneamente (ex: alteração de contrato de API).
- CI/CD pode detectar quais serviços foram alterados e fazer deploy seletivo.

**Negativas:**
- Não há mecanismo nativo para compartilhar tipos entre Go e TypeScript — o contrato de API precisa ser mantido sincronizado manualmente ou via geração de código (ex: OpenAPI codegen).

**Neutras:**
- O tooling de cada serviço permanece independente — desenvolvedores Go não precisam ter Node.js instalado para trabalhar no backend, e vice-versa.

## Alternativas Consideradas

- **Repositórios separados**: Descartado pela fricção de sincronizar mudanças de contrato entre repos e pela complexidade de CI/CD cruzado em projetos pequenos.
- **Turborepo/Nx**: Descartado neste momento por adicionar complexidade de tooling em um projeto Go+JS onde os dois serviços não compartilham código. Pode ser revisitado se surgir necessidade de compartilhar utilitários TypeScript entre múltiplos frontends.

## Referências

- golang-standards/project-layout
- Next.js App Router documentation
