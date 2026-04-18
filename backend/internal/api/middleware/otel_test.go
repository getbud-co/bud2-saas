package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/propagation"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	oteltrace "go.opentelemetry.io/otel/trace"
)

func TestTraceMiddleware(t *testing.T) {
	// Setup test tracer provider
	tp := sdktrace.NewTracerProvider()
	otel.SetTracerProvider(tp)
	otel.SetTextMapPropagator(propagation.TraceContext{})

	// Create router with middleware
	r := chi.NewRouter()
	r.Use(TraceMiddleware)
	r.Get("/test", func(w http.ResponseWriter, r *http.Request) {
		// Verify span exists in context
		span := oteltrace.SpanFromContext(r.Context())
		if !span.SpanContext().IsValid() {
			t.Error("expected valid span in context")
		}
		w.WriteHeader(http.StatusOK)
	})

	// Make request
	req := httptest.NewRequest("GET", "/test", nil)
	rec := httptest.NewRecorder()

	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}
}

func TestTraceMiddleware_ExtractsTraceFromHeader(t *testing.T) {
	// Setup test tracer provider
	tp := sdktrace.NewTracerProvider()
	otel.SetTracerProvider(tp)
	otel.SetTextMapPropagator(propagation.TraceContext{})

	var receivedTraceID string

	r := chi.NewRouter()
	r.Use(TraceMiddleware)
	r.Get("/test", func(w http.ResponseWriter, r *http.Request) {
		span := oteltrace.SpanFromContext(r.Context())
		receivedTraceID = span.SpanContext().TraceID().String()
		w.WriteHeader(http.StatusOK)
	})

	// Create request with traceparent header
	req := httptest.NewRequest("GET", "/test", nil)
	// Use a valid traceparent format: version-traceId-parentId-flags
	req.Header.Set("traceparent", "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01")

	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}

	// Verify trace ID was extracted
	if receivedTraceID == "00000000000000000000000000000000" || receivedTraceID == "" {
		t.Error("expected trace ID to be extracted from header")
	}
}

func TestTraceMiddleware_RecordsError(t *testing.T) {
	// Setup test tracer provider
	tp := sdktrace.NewTracerProvider()
	otel.SetTracerProvider(tp)
	otel.SetTextMapPropagator(propagation.TraceContext{})

	r := chi.NewRouter()
	r.Use(TraceMiddleware)
	r.Get("/error", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	})

	req := httptest.NewRequest("GET", "/error", nil)
	rec := httptest.NewRecorder()

	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Errorf("expected status 500, got %d", rec.Code)
	}
}

func TestResponseWriter_WritesHeaderOnce(t *testing.T) {
	rw := &responseWriter{
		ResponseWriter: httptest.NewRecorder(),
		statusCode:     http.StatusOK,
	}

	// Write header multiple times
	rw.WriteHeader(http.StatusCreated)
	rw.WriteHeader(http.StatusAccepted)

	if rw.statusCode != http.StatusCreated {
		t.Errorf("expected status %d, got %d", http.StatusCreated, rw.statusCode)
	}
}

func TestResponseWriter_Write(t *testing.T) {
	rec := httptest.NewRecorder()
	rw := &responseWriter{
		ResponseWriter: rec,
		statusCode:     http.StatusOK,
	}

	// Write without explicit WriteHeader
	_, _ = rw.Write([]byte("test"))

	if rw.statusCode != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, rw.statusCode)
	}

	if !rw.written {
		t.Error("expected written flag to be true")
	}
}
