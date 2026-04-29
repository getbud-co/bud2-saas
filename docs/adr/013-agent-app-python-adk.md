# ADR-013: Agent App with Python ADK

**Data**: 2026-04-29
**Status**: Proposto

## Contexto

O bud2 precisa adicionar agentes conversacionais conectados inicialmente ao WhatsApp e futuramente ao Microsoft Teams. O backend Go continua sendo a API de produto e fonte de verdade. A aplicação de agentes deve consumir a API como cliente externo, usando o contrato OpenAPI.

## Decisão

Criar uma terceira aplicação no monorepo, `agents/`, implementada em Python com Google ADK.

Decisões iniciais:

- WhatsApp é o primeiro canal.
- O agente usa o mesmo Postgres da API na primeira versão, com schema SQL próprio `agents`.
- O agente consome a bud2 API via client gerado a partir de `backend/api/openapi.yml`.
- Apenas tools explicitamente allowlisted são expostas ao LLM.
- O banco operacional dos agentes preserva `organization_id` como escopo obrigatório em
  conexões de canal, conversas, mensagens, execuções e outbox.
- Autenticação delegada/OAuth fica fora do escopo inicial.
- A autenticação inicial usa um token configurado por ambiente por trás de uma interface de credenciais substituível. Token estático é bloqueado em produção por padrão.

## Consequências

- `backend/`, `frontend/` e `agents/` têm ownership e deploy independentes.
- O agente não acessa diretamente tabelas do backend; suas tabelas vivem no schema `agents`.
- A migração futura para OAuth deve trocar apenas a implementação do credential provider.
- O schema `agents` pode ser migrado posteriormente para um banco físico separado se a operação exigir isolamento maior.
