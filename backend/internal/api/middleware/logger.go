package middleware

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"go.opentelemetry.io/otel/trace"

	"github.com/getbud-co/bud2/backend/internal/domain"
)

type responseRecorder struct {
	http.ResponseWriter
	statusCode int
	written    bool
}

func (rr *responseRecorder) WriteHeader(code int) {
	if !rr.written {
		rr.statusCode = code
		rr.written = true
		rr.ResponseWriter.WriteHeader(code)
	}
}

func (rr *responseRecorder) Write(b []byte) (int, error) {
	if !rr.written {
		rr.WriteHeader(http.StatusOK)
	}
	return rr.ResponseWriter.Write(b)
}

func RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		rr := &responseRecorder{ResponseWriter: w, statusCode: http.StatusOK}

		next.ServeHTTP(rr, r)

		duration := time.Since(start)

		attrs := []slog.Attr{
			slog.String("method", r.Method),
			slog.String("path", r.URL.Path),
			slog.Int("status", rr.statusCode),
			slog.Duration("latency", duration),
			slog.String("user_agent", r.UserAgent()),
			slog.String("remote_addr", r.RemoteAddr),
		}

		if span := trace.SpanFromContext(r.Context()); span.SpanContext().IsValid() {
			attrs = append(attrs,
				slog.String("trace_id", span.SpanContext().TraceID().String()),
				slog.String("span_id", span.SpanContext().SpanID().String()),
			)
		}

		if tenantID, err := domain.TenantIDFromContext(r.Context()); err == nil {
			attrs = append(attrs, slog.String("tenant_id", tenantID.String()))
		}

		if claims, err := domain.ClaimsFromContext(r.Context()); err == nil {
			attrs = append(attrs, slog.String("user_id", claims.UserID.String()))
		}

		routePattern := chi.RouteContext(r.Context()).RoutePattern()
		if routePattern != "" {
			attrs = append(attrs, slog.String("route", routePattern))
		}

		logger := slog.Default()
		if rr.statusCode >= 500 {
			logger.LogAttrs(r.Context(), slog.LevelError, "request error", attrs...)
		} else if rr.statusCode >= 400 {
			logger.LogAttrs(r.Context(), slog.LevelWarn, "request warning", attrs...)
		} else {
			logger.LogAttrs(r.Context(), slog.LevelInfo, "request completed", attrs...)
		}
	})
}
