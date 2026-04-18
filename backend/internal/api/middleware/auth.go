package middleware

import (
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/api/httputil"
	"github.com/getbud-co/bud2/backend/internal/domain"
)

type AuthMiddlewareConfig struct {
	JWTSecret string
}

func AuthMiddleware(cfg AuthMiddlewareConfig) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				httputil.WriteProblem(w, http.StatusUnauthorized, "Unauthorized", "Authorization header is required")
				return
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
				httputil.WriteProblem(w, http.StatusUnauthorized, "Unauthorized", "Invalid authorization header format")
				return
			}

			tokenString := parts[1]
			token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, jwt.ErrSignatureInvalid
				}
				return []byte(cfg.JWTSecret), nil
			})

			if err != nil || !token.Valid {
				httputil.WriteProblem(w, http.StatusUnauthorized, "Unauthorized", "Invalid or expired token")
				return
			}

			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				httputil.WriteProblem(w, http.StatusUnauthorized, "Unauthorized", "Invalid token claims")
				return
			}

			userIDStr, ok := claims["user_id"].(string)
			if !ok {
				httputil.WriteProblem(w, http.StatusUnauthorized, "Unauthorized", "Missing user_id in token")
				return
			}
			userID, err := uuid.Parse(userIDStr)
			if err != nil {
				httputil.WriteProblem(w, http.StatusUnauthorized, "Unauthorized", "Invalid user_id format")
				return
			}

			userClaims := domain.UserClaims{
				UserID: domain.UserID(userID),
			}

			if activeOrganizationIDStr, ok := claims["active_organization_id"].(string); ok && activeOrganizationIDStr != "" {
				activeOrganizationID, err := uuid.Parse(activeOrganizationIDStr)
				if err != nil {
					httputil.WriteProblem(w, http.StatusUnauthorized, "Unauthorized", "Invalid active_organization_id format")
					return
				}
				userClaims.ActiveOrganizationID = domain.TenantID(activeOrganizationID)
				userClaims.HasActiveOrganization = true
			}

			if membershipRole, ok := claims["membership_role"].(string); ok {
				userClaims.MembershipRole = membershipRole
			}

			if isSystemAdmin, ok := claims["is_system_admin"].(bool); ok {
				userClaims.IsSystemAdmin = isSystemAdmin
			}

			ctx := domain.ClaimsToContext(r.Context(), userClaims)
			if userClaims.HasActiveOrganization {
				ctx = domain.TenantIDToContext(ctx, userClaims.ActiveOrganizationID)
			}
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

type PermissionChecker interface {
	Enforce(rvals ...interface{}) (bool, error)
}

func RequirePermission(checker PermissionChecker, obj, act string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, err := domain.ClaimsFromContext(r.Context())
			if err != nil {
				httputil.WriteProblem(w, http.StatusUnauthorized, "Unauthorized", "Authentication required")
				return
			}
			if claims.IsSystemAdmin {
				next.ServeHTTP(w, r)
				return
			}

			allowed, err := checker.Enforce(claims.MembershipRole, obj, act)
			if err != nil {
				httputil.WriteProblem(w, http.StatusInternalServerError, "Internal Server Error", "Authorization check failed")
				return
			}

			if !allowed {
				httputil.WriteProblem(w, http.StatusForbidden, "Forbidden", "Insufficient permissions")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
