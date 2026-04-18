package middleware_test

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/getbud-co/bud2/backend/internal/api/middleware"
)

func TestBodySizeLimit_UnderLimit(t *testing.T) {
	handler := middleware.BodySizeLimit(100)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		buf := make([]byte, 50)
		n, _ := r.Body.Read(buf)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(buf[:n])
	}))

	body := strings.Repeat("a", 50)
	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewBufferString(body))
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
}

func TestBodySizeLimit_NoBody(t *testing.T) {
	handler := middleware.BodySizeLimit(100)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
}

func TestBodySizeLimit_OverLimit_DetectedByDecodeJSON(t *testing.T) {
	// The middleware wraps r.Body; when handlers try to read beyond maxBytes,
	// http.MaxBytesReader sets the response to 413. The httputil.DecodeJSON helper
	// is responsible for detecting *http.MaxBytesError and returning 413.
	// This test verifies the body is wrapped and read fails past the limit.
	handler := middleware.BodySizeLimit(10)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		buf := make([]byte, 100)
		_, err := r.Body.Read(buf)
		if err != nil {
			// MaxBytesReader returns a *http.MaxBytesError when limit is exceeded
			http.Error(w, "too large", http.StatusRequestEntityTooLarge)
			return
		}
		w.WriteHeader(http.StatusOK)
	}))

	body := strings.Repeat("a", 100)
	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewBufferString(body))
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusRequestEntityTooLarge, rec.Code)
}
