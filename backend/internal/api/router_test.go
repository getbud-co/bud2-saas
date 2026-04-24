package api

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	apiauth "github.com/getbud-co/bud2/backend/internal/api/auth"
	apiorg "github.com/getbud-co/bud2/backend/internal/api/organization"
	apiteam "github.com/getbud-co/bud2/backend/internal/api/team"
	apiuser "github.com/getbud-co/bud2/backend/internal/api/user"
	apporg "github.com/getbud-co/bud2/backend/internal/app/organization"
	"github.com/getbud-co/bud2/backend/internal/domain"
	org "github.com/getbud-co/bud2/backend/internal/domain/organization"
	infraauth "github.com/getbud-co/bud2/backend/internal/infra/auth"
)

type stubBootstrapHandler struct{}

func (stubBootstrapHandler) Create(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNoContent)
}

type stubPermissionChecker struct{}

func (stubPermissionChecker) Enforce(rvals ...interface{}) (bool, error) {
	if len(rvals) == 3 && rvals[1] == "org" && rvals[2] == "create" {
		return false, nil
	}
	return true, nil
}

type stubListUseCase struct{}

func (stubListUseCase) Execute(ctx context.Context, cmd apporg.ListCommand) (org.ListResult, error) {
	return org.ListResult{}, nil
}

func TestNewRouter_OrganizationsDoNotRequireActiveTenantForSystemAdmin(t *testing.T) {
	issuer := infraauth.NewTokenIssuer("test-secret")
	token, err := issuer.IssueToken(domain.UserClaims{UserID: domain.UserID(uuid.MustParse("660e8400-e29b-41d4-a716-446655440000")), IsSystemAdmin: true}, time.Hour)
	require.NoError(t, err)

	router := NewRouter(
		stubBootstrapHandler{},
		&apiauth.Handler{},
		apiorg.NewHandler(nil, nil, stubListUseCase{}, nil, nil),
		apiuser.NewHandler(nil, nil, nil, nil, nil, nil, nil, nil),
		apiteam.NewHandler(nil, nil, nil, nil, nil),
		RouterConfig{JWTSecret: "test-secret", Enforcer: stubPermissionChecker{}, MaxBodySize: 1024, RequestTimeout: time.Second},
	)

	req := httptest.NewRequest(http.MethodGet, "/organizations", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestNewRouter_UsersStillRequireActiveTenant(t *testing.T) {
	issuer := infraauth.NewTokenIssuer("test-secret")
	token, err := issuer.IssueToken(domain.UserClaims{UserID: domain.UserID(uuid.MustParse("660e8400-e29b-41d4-a716-446655440000")), MembershipRole: "admin"}, time.Hour)
	require.NoError(t, err)

	router := NewRouter(
		stubBootstrapHandler{},
		&apiauth.Handler{},
		apiorg.NewHandler(nil, nil, stubListUseCase{}, nil, nil),
		apiuser.NewHandler(nil, nil, nil, nil, nil, nil, nil, nil),
		apiteam.NewHandler(nil, nil, nil, nil, nil),
		RouterConfig{JWTSecret: "test-secret", Enforcer: stubPermissionChecker{}, MaxBodySize: 1024, RequestTimeout: time.Second},
	)

	req := httptest.NewRequest(http.MethodGet, "/users", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)
	assert.Contains(t, rr.Body.String(), "tenant_id is required")
}

func TestNewRouter_OrganizationCreateRequiresSystemAdmin(t *testing.T) {
	issuer := infraauth.NewTokenIssuer("test-secret")
	token, err := issuer.IssueToken(domain.UserClaims{UserID: domain.UserID(uuid.MustParse("660e8400-e29b-41d4-a716-446655440000")), MembershipRole: "admin"}, time.Hour)
	require.NoError(t, err)

	router := NewRouter(
		stubBootstrapHandler{},
		&apiauth.Handler{},
		apiorg.NewHandler(nil, nil, stubListUseCase{}, nil, nil),
		apiuser.NewHandler(nil, nil, nil, nil, nil, nil, nil, nil),
		apiteam.NewHandler(nil, nil, nil, nil, nil),
		RouterConfig{JWTSecret: "test-secret", Enforcer: stubPermissionChecker{}, MaxBodySize: 1024, RequestTimeout: time.Second},
	)

	req := httptest.NewRequest(http.MethodPost, "/organizations", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusForbidden, rr.Code)
}
