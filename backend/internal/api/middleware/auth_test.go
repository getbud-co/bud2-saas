package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"

	"github.com/getbud-co/bud2/backend/internal/domain"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
)

func TestAuthMiddleware_ValidTokenWithActiveOrganization(t *testing.T) {
	secret := "test-secret"
	middleware := AuthMiddleware(AuthMiddlewareConfig{JWTSecret: secret})
	orgID := uuid.New()
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":                uuid.New().String(),
		"active_organization_id": orgID.String(),
		"membership_role":        "admin",
		"is_system_admin":        false,
		"exp":                    time.Now().Add(time.Hour).Unix(),
	})
	tokenString, _ := token.SignedString([]byte(secret))

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, err := domain.ClaimsFromContext(r.Context())
		assert.NoError(t, err)
		assert.True(t, claims.HasActiveOrganization)
		assert.Equal(t, "admin", claims.MembershipRole)
		tenantID, err := domain.TenantIDFromContext(r.Context())
		assert.NoError(t, err)
		assert.Equal(t, orgID.String(), tenantID.String())
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer "+tokenString)
	rr := httptest.NewRecorder()
	middleware(handler).ServeHTTP(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestAuthMiddleware_ValidTokenWithoutActiveOrganization(t *testing.T) {
	secret := "test-secret"
	middleware := AuthMiddleware(AuthMiddlewareConfig{JWTSecret: secret})
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":         uuid.New().String(),
		"membership_role": "",
		"is_system_admin": true,
		"exp":             time.Now().Add(time.Hour).Unix(),
	})
	tokenString, _ := token.SignedString([]byte(secret))

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, err := domain.ClaimsFromContext(r.Context())
		assert.NoError(t, err)
		assert.False(t, claims.HasActiveOrganization)
		_, err = domain.TenantIDFromContext(r.Context())
		assert.Error(t, err)
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer "+tokenString)
	rr := httptest.NewRecorder()
	middleware(handler).ServeHTTP(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestRequirePermission_Success(t *testing.T) {
	mockChecker := new(mocks.PermissionChecker)
	middleware := RequirePermission(mockChecker, "org", "write")
	mockChecker.On("Enforce", "admin", "org", "write").Return(true, nil)
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) })
	req := httptest.NewRequest(http.MethodGet, "/", nil).WithContext(fixtures.NewContextWithAdminUser())
	rr := httptest.NewRecorder()
	middleware(handler).ServeHTTP(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestRequirePermission_SystemAdminBypass(t *testing.T) {
	mockChecker := new(mocks.PermissionChecker)
	middleware := RequirePermission(mockChecker, "org", "write")
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) })
	claims := fixtures.NewTestUserClaims()
	claims.IsSystemAdmin = true
	claims.MembershipRole = ""
	req := httptest.NewRequest(http.MethodGet, "/", nil).WithContext(fixtures.NewContextWithUserClaims(claims))
	rr := httptest.NewRecorder()
	middleware(handler).ServeHTTP(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
	mockChecker.AssertNotCalled(t, "Enforce")
}
