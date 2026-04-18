# ADR-010: Observabilidade com OpenTelemetry

**Data**: 2026-03-24
**Status**: Aceito

## Contexto

O sistema já usa `context.Context` em toda a cadeia (handler → usecase → infra). Adicionar observabilidade depois exige tocar cada camada retroativamente. O slog (ADR-008) cobre logging estruturado, mas não fornece trace ID automático, rastreamento de queries SQL, métricas de latência ou correlação entre logs e spans.

## Decisão

Adotar **OpenTelemetry Go SDK** como padrão de observabilidade, iniciando com exporter no-op — sem nenhuma dependência de infraestrutura nova.

### Sinais cobertos

| Sinal | Ferramenta | Status inicial |
|-------|-----------|----------------|
| Traces | OTEL SDK + chi middleware | no-op exporter |
| Métricas | OTEL SDK | no-op exporter |
| Logs | slog + otellogr bridge | trace_id/span_id injetados |

### Posição nas camadas

```
main.go
  └─ configura TracerProvider + MeterProvider (no-op ou OTLP via env)

handler/ (chi middleware)
  └─ extrai/cria trace do request → injeta no context.Context
  └─ loga trace_id e span_id via slog bridge

infra/postgres/
  └─ instrumenta queries via otelpgx (pgx contrib)

usecase/ e domain/
  └─ não importam OTEL diretamente — usam context.Context normalmente
```

### Configuração por ambiente

O exporter é controlado por variável de ambiente — sem mudança de código:

```
OTEL_EXPORTER_OTLP_ENDPOINT=  # vazio = no-op
OTEL_SERVICE_NAME=bud2-backend
OTEL_ENVIRONMENT=production
```

Em produção, basta apontar `OTEL_EXPORTER_OTLP_ENDPOINT` para o backend escolhido (Cloud Trace, Jaeger, Tempo) sem recompilar.

### Integração slog + OTEL

Todo log de request inclui automaticamente `trace_id` e `span_id`, correlacionando logs com traces:

```json
{
  "time": "2026-03-24T10:00:00Z",
  "level": "INFO",
  "msg": "request completed",
  "trace_id": "abc123",
  "span_id": "def456",
  "method": "POST",
  "path": "/users",
  "status": 201,
  "latency_ms": 42
}
```

## Consequências

**Positivas:**
- Instrumentação desde o início — sem refatoração retroativa quando observabilidade for necessária.
- Trace ID correlaciona logs + spans automaticamente via context.Context (mesmo mecanismo já usado para JWT claims).
- Exporter no-op = zero overhead e zero dependência de infra nova no curto prazo.
- Vendor-neutral — troca de backend (Cloud Trace, Datadog, Jaeger) sem mudar código.
- pgx contrib instrumenta queries SQL automaticamente — queries lentas visíveis sem código adicional.

**Negativas:**
- Adiciona dependências Go (go.opentelemetry.io/otel e contrib packages).
- usecase/ e domain/ não precisam importar OTEL, mas devem sempre propagar o context recebido — convenção a ser seguida.

## Decisão de backend (futura)

A escolha do backend de observabilidade (Cloud Trace, Grafana Tempo + Prometheus, Jaeger, Datadog) é uma decisão de infraestrutura/deploy — separada desta ADR. O código permanece idêntico independente da escolha.

## Alternativas Consideradas

- **Sem OTEL agora**: Descartado — adicionar depois requer tocar cada camada. Custo de instrumentar no início é próximo de zero com exporter no-op.
- **Datadog APM / New Relic agent**: Descartados por acoplar o código a um vendor específico. OTEL mantém vendor-neutrality.
- **Apenas slog**: Insuficiente — sem rastreamento de queries, sem métricas, sem correlação automática de trace ID.

## Referências

- https://opentelemetry.io/docs/languages/go/
- https://github.com/open-telemetry/opentelemetry-go-contrib (chi middleware, pgx)
- https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/github.com/go-chi/chi/v5/otelchi
