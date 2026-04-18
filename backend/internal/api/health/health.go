package health

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type HealthChecker struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *HealthChecker {
	return &HealthChecker{pool: pool}
}

type HealthResponse struct {
	Status    string            `json:"status"`
	Timestamp string            `json:"timestamp"`
	Checks    map[string]string `json:"checks,omitempty"`
}

func (h *HealthChecker) Live(w http.ResponseWriter, r *http.Request) {
	response := HealthResponse{
		Status:    "ok",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(response)
}

func (h *HealthChecker) Ready(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	checks := make(map[string]string)
	status := "ok"
	statusCode := http.StatusOK

	if h.pool != nil {
		if err := h.pool.Ping(ctx); err != nil {
			checks["database"] = "unavailable: " + err.Error()
			status = "error"
			statusCode = http.StatusServiceUnavailable
		} else {
			checks["database"] = "ok"
		}
	} else {
		checks["database"] = "not configured"
	}

	response := HealthResponse{
		Status:    status,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Checks:    checks,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(response)
}
