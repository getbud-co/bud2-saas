package health

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHealthChecker_Live(t *testing.T) {
	checker := New(nil)

	req := httptest.NewRequest("GET", "/health/live", nil)
	rec := httptest.NewRecorder()

	checker.Live(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}

	var response HealthResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	if response.Status != "ok" {
		t.Errorf("expected status 'ok', got '%s'", response.Status)
	}

	if response.Timestamp == "" {
		t.Error("expected timestamp to be set")
	}
}

func TestHealthChecker_Ready_NoPool(t *testing.T) {
	checker := New(nil)

	req := httptest.NewRequest("GET", "/health/ready", nil)
	rec := httptest.NewRecorder()

	checker.Ready(rec, req)

	// Without a pool, it should still return OK but note "not configured"
	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}

	var response HealthResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	if response.Status != "ok" {
		t.Errorf("expected status 'ok', got '%s'", response.Status)
	}

	if response.Checks == nil {
		t.Error("expected checks to be set")
	}

	if response.Checks["database"] != "not configured" {
		t.Errorf("expected database check to be 'not configured', got '%s'", response.Checks["database"])
	}
}

func TestHealthChecker_Ready_ContentType(t *testing.T) {
	checker := New(nil)

	req := httptest.NewRequest("GET", "/health/ready", nil)
	rec := httptest.NewRecorder()

	checker.Ready(rec, req)

	contentType := rec.Header().Get("Content-Type")
	if contentType != "application/json" {
		t.Errorf("expected Content-Type 'application/json', got '%s'", contentType)
	}
}

func TestHealthChecker_Live_ContentType(t *testing.T) {
	checker := New(nil)

	req := httptest.NewRequest("GET", "/health/live", nil)
	rec := httptest.NewRecorder()

	checker.Live(rec, req)

	contentType := rec.Header().Get("Content-Type")
	if contentType != "application/json" {
		t.Errorf("expected Content-Type 'application/json', got '%s'", contentType)
	}
}
