package middleware

import (
	"net/http"

	"github.com/getbud-co/bud2/backend/internal/api/httputil"
	"github.com/getbud-co/bud2/backend/internal/domain"
)

func TenantMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, err := domain.TenantIDFromContext(r.Context()); err != nil {
			httputil.WriteProblem(w, http.StatusUnauthorized, "Unauthorized", "tenant_id is required")
			return
		}
		next.ServeHTTP(w, r)
	})
}
