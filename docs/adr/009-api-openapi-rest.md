# ADR-009: Contrato de API — OpenAPI Spec-First, RESTful

**Data**: 2026-03-24
**Status**: Aceito

## Contexto

O frontend Next.js consome a API Go via HTTP. Sem um contrato formal, os tipos TypeScript em `src/lib/api.ts` divergem silenciosamente dos endpoints Go. Precisamos de uma fonte da verdade para o contrato de API.

## Decisão

Adotar **OpenAPI 3.1 spec-first** com **REST** como estilo arquitetural.

### Workflow

1. A spec OpenAPI é escrita manualmente em `backend/api/openapi.yml` — é a fonte da verdade.
2. A partir da spec, tipos TypeScript são gerados para o frontend via `openapi-typescript`.
3. Os handlers Go são implementados manualmente seguindo a spec — sem geração de código Go server (mantém o controle total sobre o handler).

```
backend/api/openapi.yml  (fonte da verdade)
        ↓                         ↓
  Implementação Go         Tipos TypeScript gerados
  (manual, segue spec)     frontend/src/lib/types.ts
```

### Convenções REST

- Recursos no plural e em kebab-case: `/users`, `/order-items`
- Verbos HTTP semânticos: `GET` (leitura), `POST` (criação), `PUT` (substituição), `PATCH` (atualização parcial), `DELETE` (remoção)
- IDs na URL para recursos específicos: `GET /users/{id}`
- Erros no formato RFC 7807 (Problem Details):

```json
{
  "type": "https://bud2.com/errors/validation",
  "title": "Validation Error",
  "status": 422,
  "detail": "Email is invalid",
  "errors": [{ "field": "email", "message": "must be a valid email" }]
}
```

### Makefile

```makefile
api-types:
    npx openapi-typescript backend/api/openapi.yml -o frontend/src/lib/types.ts
```

## Consequências

**Positivas:**
- Frontend e backend compartilham contrato formal — drift detectado pela geração de tipos.
- OpenAPI é padrão de mercado — suporte nativo em ferramentas de teste (Postman, Bruno), documentação (Swagger UI), e gateways.
- Spec-first força pensar no contrato antes de implementar — melhora o design da API.

**Negativas:**
- Passo adicional de geração (`make api-types`) quando a spec muda.
- Spec escrita manualmente — pode ficar desatualizada se não houver disciplina de atualizar junto com o handler.

## Alternativas Consideradas

- **Contrato manual**: Tipos TypeScript escritos à mão em `api.ts`. Descartado — drift silencioso inevitável.
- **gRPC**: Descartado por adicionar complexidade de tooling (protobuf, grpc-web) sem necessidade para um frontend web padrão.
- **Code-first (geração de spec a partir do código Go)**: Descartado por acoplar o design da API aos detalhes de implementação dos handlers.

## Referências

- OpenAPI 3.1: https://spec.openapis.org/oas/v3.1.0
- openapi-typescript: https://openapi-ts.dev
- RFC 7807 Problem Details: https://www.rfc-editor.org/rfc/rfc7807
