# ADR-002: Nomenclatura das Camadas Internas do Backend Go

**Data**: 2026-03-24
**Status**: Aceito

## Contexto

A estrutura inicial do backend usava `internal/service/` para lógica de negócio e `internal/repository/` para acesso a dados. Esses nomes são ambíguos: `service/` pode conter tanto Application Services quanto Domain Services; `repository/` mistura a interface (que pertence ao domínio) com a implementação concreta (que pertence à infraestrutura).

## Decisão

Renomear os pacotes para refletir com precisão o papel de cada camada segundo Clean Architecture:

- `internal/service/` → `internal/usecase/`: Contém Application Services que orquestram Use Cases. Não contém lógica de domínio.
- `internal/repository/` → abolido como pacote único. As interfaces de Repository são declaradas em `internal/domain/` (definidas pelo consumidor, idiomático em Go). As implementações concretas vão para `internal/infra/` (ex: `internal/infra/postgres/`).

O fluxo de dependência resultante é:

```
cmd/api/main.go (composição)
  └─ handler/ → usecase/ → domain/
                              ↑
                           infra/ (implementa interfaces de domain/)
```

## Consequências

**Positivas:**
- A Dependency Rule de Clean Architecture é respeitada — `domain/` nunca importa `infra/`.
- Interfaces definidas pelo consumidor em `domain/` é o padrão idiomático Go.
- `usecase/` como nome comunica claramente que cada struct/função ali representa um caso de uso de negócio identificável — rastreável até requisitos.

**Negativas:**
- Desenvolvedores vindos de arquiteturas MVC precisam aprender a distinção entre Use Case e Domain Service.

## Alternativas Consideradas

- **Manter `service/`**: Descartado pela ambiguidade que cria entre Application Services e Domain Services à medida que o projeto cresce.
- **Usar `app/` para Use Cases**: Padrão visto em alguns projetos Go. Descartado por ser menos expressivo que `usecase/`.
- **Colocar interfaces de Repository em `repository/`**: Descartado por violar a Dependency Rule — forçaria `usecase/` a importar `repository/` para conhecer a interface, acoplando Use Cases a um nome de camada de infraestrutura.

## Referências

- Robert C. Martin, "Clean Architecture" (2017), Cap. 22
- Vaughn Vernon, "Implementing Domain-Driven Design" (2013) — Repository pattern
