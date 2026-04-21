# ADR-002: Camadas Internas do Backend

**Data**: 2026-03-24
**Status**: Aceito

## Decisão

O backend usa quatro camadas internas com a regra de dependência:

`api -> app -> domain <- infra`

- `api/`: HTTP, DTOs, middlewares e mapeamento de erro
- `app/`: casos de uso e orquestração
- `domain/`: entidades, contratos, value objects e erros
- `infra/`: Postgres, JWT, Casbin, OTel e demais detalhes concretos

`cmd/api/main.go` é o composition root.

## Consequências

- Regras de negócio ficam fora de handlers e SQL.
- Dependências concretas entram pelo composition root.
- Testes unitários podem focar em `app/` e `domain/`; integrações focam `infra/` e slices HTTP.
