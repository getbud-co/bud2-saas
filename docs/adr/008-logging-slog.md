# ADR-008: Structured Logging com slog

**Data**: 2026-03-24
**Status**: Aceito

## Contexto

O sistema precisa de logging estruturado para observabilidade. As opções principais são `slog` (stdlib, Go 1.21+) ou bibliotecas externas como `zerolog` ou `zap`.

## Decisão

Adotar **`log/slog`** da stdlib do Go.

- Logger global configurado em `main.go` com handler JSON em produção e handler text em desenvolvimento.
- Middleware chi injeta `slog.Logger` com campos de request (trace ID, método, path) no `context.Context`.
- Use cases e infra loggam via `slog.Default()` ou logger extraído do contexto.
- Campos obrigatórios em todo log de request: `trace_id`, `method`, `path`, `status`, `latency_ms`, `user_id` (quando autenticado).

```go
// main.go — configuração por ambiente
if env == "production" {
    slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, nil)))
} else {
    slog.SetDefault(slog.New(slog.NewTextHandler(os.Stdout, nil)))
}
```

## Consequências

**Positivas:**
- Zero dependência externa.
- API estável — parte da stdlib desde Go 1.21.
- JSON handler nativo compatível com Cloud Logging (GCP), Datadog, e qualquer sistema que consuma JSON estruturado.
- Substituível por `zerolog` no futuro sem alterar call sites (basta trocar o handler).

**Negativas:**
- Performance inferior ao `zerolog` (zero allocation) em cargas muito altas — aceitável para o estágio atual.

## Alternativas Consideradas

- **zerolog**: Performance superior (zero allocation). Descartado por adicionar dependência externa sem necessidade imediata — pode ser introduzido se o profiling indicar logging como gargalo.
- **zap (Uber)**: API mais verbosa. Descartado pelo mesmo motivo.

## Referências

- https://pkg.go.dev/log/slog (Go 1.21+)
