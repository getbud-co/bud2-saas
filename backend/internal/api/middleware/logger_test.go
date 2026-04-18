package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"go.opentelemetry.io/otel"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"

	"github.com/getbud-co/bud2/backend/internal/domain"
)

func TestRequestLogger_BasicRequest(t *testing.T) {
	// Setup
	tp := sdktrace.NewTracerProvider()
	otel.SetTracerProvider(tp)

	r := chi.NewRouter()
	r.Use(RequestLogger)
	r.Get("/test", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("OK"))
	})

	req := httptest.NewRequest("GET", "/test", nil)
	rec := httptest.NewRecorder()

	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}
}

func TestRequestLogger_WithTenantID(t *testing.T) {
	// Setup
	tp := sdktrace.NewTracerProvider()
	otel.SetTracerProvider(tp)

	r := chi.NewRouter()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tenantID := domain.TenantID(uuid.MustParse("550e8400-e29b-41d4-a716-446655440000"))
			ctx := domain.TenantIDToContext(r.Context(), tenantID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	})
	r.Use(RequestLogger)
	r.Get("/test", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest("GET", "/test", nil)
	rec := httptest.NewRecorder()

	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}
}

func TestRequestLogger_WithUserClaims(t *testing.T) {
	// Setup
	tp := sdktrace.NewTracerProvider()
	otel.SetTracerProvider(tp)

	r := chi.NewRouter()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := domain.UserClaims{
				UserID:                domain.UserID(uuid.MustParse("550e8400-e29b-41d4-a716-446655440001")),
				ActiveOrganizationID:  domain.TenantID(uuid.MustParse("550e8400-e29b-41d4-a716-446655440000")),
				HasActiveOrganization: true,
				MembershipRole:        "admin",
			}
			ctx := domain.ClaimsToContext(r.Context(), claims)
			ctx = domain.TenantIDToContext(ctx, claims.ActiveOrganizationID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	})
	r.Use(RequestLogger)
	r.Get("/test", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest("GET", "/test", nil)
	rec := httptest.NewRecorder()

	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}
}

func TestRequestLogger_ErrorStatus(t *testing.T) {
	// Setup
	tp := sdktrace.NewTracerProvider()
	otel.SetTracerProvider(tp)

	r := chi.NewRouter()
	r.Use(RequestLogger)
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

func TestRequestLogger_WarningStatus(t *testing.T) {
	// Setup
	tp := sdktrace.NewTracerProvider()
	otel.SetTracerProvider(tp)

	r := chi.NewRouter()
	r.Use(RequestLogger)
	r.Get("/notfound", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	})

	req := httptest.NewRequest("GET", "/notfound", nil)
	rec := httptest.NewRecorder()

	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Errorf("expected status 404, got %d", rec.Code)
	}
}

func TestResponseRecorder_WriteHeader(t *testing.T) {
	rec := httptest.NewRecorder()
	rr := &responseRecorder{
		ResponseWriter: rec,
		statusCode:     http.StatusOK,
	}

	// Write header once
	rr.WriteHeader(http.StatusCreated)

	if rr.statusCode != http.StatusCreated {
		t.Errorf("expected status %d, got %d", http.StatusCreated, rr.statusCode)
	}

	if !rr.written {
		t.Error("expected written flag to be true")
	}

	// Try to write again (should be ignored)
	rr.WriteHeader(http.StatusAccepted)

	if rr.statusCode != http.StatusCreated {
		t.Errorf("expected status to remain %d, got %d", http.StatusCreated, rr.statusCode)
	}
}

func TestResponseRecorder_Write(t *testing.T) {
	rec := httptest.NewRecorder()
	rr := &responseRecorder{
		ResponseWriter: rec,
		statusCode:     http.StatusOK,
	}

	// Write without explicit WriteHeader
	n, err := rr.Write([]byte("test"))
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}

	if n != 4 {
		t.Errorf("expected 4 bytes written, got %d", n)
	}

	if rr.statusCode != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, rr.statusCode)
	}

	if !rr.written {
		t.Error("expected written flag to be true")
	}
}
