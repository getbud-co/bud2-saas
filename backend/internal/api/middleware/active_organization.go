package middleware

import (
	"context"
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/getbud-co/bud2/backend/internal/api/httputil"
	"github.com/getbud-co/bud2/backend/internal/domain"
	"github.com/getbud-co/bud2/backend/internal/infra/postgres/sqlc"
)

type ActiveOrganizationQuerier interface {
	GetOrganizationByID(ctx context.Context, id uuid.UUID) (sqlc.GetOrganizationByIDRow, error)
	GetActiveOrganizationMembership(ctx context.Context, arg sqlc.GetActiveOrganizationMembershipParams) (sqlc.GetActiveOrganizationMembershipRow, error)
}

func ActiveOrganizationMiddleware(queries ActiveOrganizationQuerier) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tenantID, err := domain.TenantIDFromContext(r.Context())
			if err != nil {
				httputil.WriteProblem(w, http.StatusUnauthorized, "Unauthorized", "tenant_id is required")
				return
			}

			if _, err := queries.GetOrganizationByID(r.Context(), tenantID.UUID()); err != nil {
				if err == pgx.ErrNoRows {
					httputil.WriteProblem(w, http.StatusUnauthorized, "Unauthorized", "active organization is invalid")
					return
				}
				httputil.WriteProblem(w, http.StatusInternalServerError, "Internal Server Error", "failed to validate active organization")
				return
			}

			claims, err := domain.ClaimsFromContext(r.Context())
			if err != nil {
				httputil.WriteProblem(w, http.StatusUnauthorized, "Unauthorized", "authentication required")
				return
			}
			if !claims.IsSystemAdmin {
				membership, err := queries.GetActiveOrganizationMembership(r.Context(), sqlc.GetActiveOrganizationMembershipParams{
					OrganizationID: tenantID.UUID(),
					UserID:         claims.UserID.UUID(),
				})
				if err != nil {
					if err == pgx.ErrNoRows {
						httputil.WriteProblem(w, http.StatusUnauthorized, "Unauthorized", "active organization membership is invalid")
						return
					}
					httputil.WriteProblem(w, http.StatusInternalServerError, "Internal Server Error", "failed to validate active organization membership")
					return
				}

				claims.MembershipRole = membership.Role
				r = r.WithContext(domain.ClaimsToContext(r.Context(), claims))
			}

			next.ServeHTTP(w, r)
		})
	}
}
