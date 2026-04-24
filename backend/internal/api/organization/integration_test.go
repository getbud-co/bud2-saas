//go:build integration

package organization_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	apispec "github.com/getbud-co/bud2/backend/api"
	rootapi "github.com/getbud-co/bud2/backend/internal/api"
	apiauth "github.com/getbud-co/bud2/backend/internal/api/auth"
	apiorg "github.com/getbud-co/bud2/backend/internal/api/organization"
	apiteam "github.com/getbud-co/bud2/backend/internal/api/team"
	apiuser "github.com/getbud-co/bud2/backend/internal/api/user"
	apporg "github.com/getbud-co/bud2/backend/internal/app/organization"
	appuser "github.com/getbud-co/bud2/backend/internal/app/user"
	"github.com/getbud-co/bud2/backend/internal/domain"
	"github.com/getbud-co/bud2/backend/internal/domain/organization"
	"github.com/getbud-co/bud2/backend/internal/domain/user"
	infraauth "github.com/getbud-co/bud2/backend/internal/infra/auth"
	"github.com/getbud-co/bud2/backend/internal/infra/postgres"
	"github.com/getbud-co/bud2/backend/internal/infra/postgres/sqlc"
	"github.com/getbud-co/bud2/backend/internal/infra/rbac"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

type noopBootstrapHandler struct{}

func (noopBootstrapHandler) Create(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNotImplemented)
}

func TestOrganizationsIntegration_UserScopedAccessAndSystemAdminCreate(t *testing.T) {
	env := testutil.NewPostgresIntegrationEnv(t)
	ctx := context.Background()
	queries := sqlc.New(env.Pool)
	orgRepo := postgres.NewOrgRepository(queries)
	userRepo := postgres.NewUserRepository(queries)
	teamRepo := postgres.NewTeamRepository(queries)
	txManager := postgres.NewTxManager(env.Pool)
	logger := testutil.NewDiscardLogger()

	orgHandler := apiorg.NewHandler(
		apporg.NewCreateUseCase(orgRepo, logger),
		apporg.NewGetUseCase(orgRepo, logger),
		apporg.NewListUseCase(orgRepo, logger),
		apporg.NewUpdateUseCase(orgRepo, logger),
		apporg.NewDeleteUseCase(txManager, logger),
	)
	userHandler := apiuser.NewHandler(
		appuser.NewCreateUseCase(userRepo, orgRepo, txManager, infraauth.NewDefaultBcryptPasswordHasher(), logger),
		appuser.NewGetUseCase(userRepo, logger),
		appuser.NewListUseCase(userRepo, logger),
		appuser.NewUpdateUseCase(userRepo, txManager, logger),
		appuser.NewDeleteUseCase(txManager, logger),
		appuser.NewGetMembershipUseCase(userRepo, logger),
		appuser.NewUpdateMembershipUseCase(txManager, logger),
		teamRepo,
	)

	require.NoError(t, rbac.InitEnforcer(filepath.Join(env.BackendRoot, "policies", "model.conf"), filepath.Join(env.BackendRoot, "policies", "policy.csv")))
	router := rootapi.NewRouter(noopBootstrapHandler{}, &apiauth.Handler{}, orgHandler, userHandler, &apiteam.Handler{}, rootapi.RouterConfig{
		Env:            "test",
		AllowedOrigins: []string{"http://localhost:3000"},
		OpenAPISpec:    apispec.Spec,
		JWTSecret:      "test-secret",
		Enforcer:       rbac.Enforcer(),
		Pool:           env.Pool,
		MaxBodySize:    1024 * 1024,
		RequestTimeout: 30 * time.Second,
	})
	server := httptest.NewServer(router)
	t.Cleanup(server.Close)

	orgA, err := orgRepo.Create(ctx, &organization.Organization{Name: "Alpha", Domain: "alpha.example.com", Workspace: "alpha", Status: organization.StatusActive})
	require.NoError(t, err)
	orgB, err := orgRepo.Create(ctx, &organization.Organization{Name: "Beta", Domain: "beta.example.com", Workspace: "beta", Status: organization.StatusActive})
	require.NoError(t, err)

	regularUser, err := userRepo.Create(ctx, &user.User{
		ID:           uuid.New(),
		FirstName:    "Regular",
		LastName:     "User",
		Email:        "regular@example.com",
		PasswordHash: "hashed",
		Status:       user.StatusActive,
		Language:     "pt-br",
		Memberships: []organization.Membership{{
			OrganizationID: orgA.ID,
			Role:           organization.MembershipRoleSuperAdmin,
			Status:         organization.MembershipStatusActive,
		}},
	})
	require.NoError(t, err)

	issuer := infraauth.NewTokenIssuer("test-secret")
	regularToken, err := issuer.IssueToken(domain.UserClaims{UserID: domain.UserID(regularUser.ID), MembershipRole: "super-admin"}, time.Hour)
	require.NoError(t, err)
	sysAdminToken, err := issuer.IssueToken(domain.UserClaims{UserID: domain.UserID(uuid.New()), IsSystemAdmin: true}, time.Hour)
	require.NoError(t, err)

	t.Run("user lists only own organizations and gets 404 for inaccessible org", func(t *testing.T) {
		resp := doAuthorizedRequest(t, server.URL, regularToken, http.MethodGet, "/organizations", nil)
		defer resp.Body.Close()
		require.Equal(t, http.StatusOK, resp.StatusCode)

		var listResp apiorg.ListResponse
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&listResp))
		require.Len(t, listResp.Data, 1)
		assert.Equal(t, orgA.ID, listResp.Data[0].ID)

		resp = doAuthorizedRequest(t, server.URL, regularToken, http.MethodGet, "/organizations/"+orgB.ID.String(), nil)
		defer resp.Body.Close()
		assert.Equal(t, http.StatusNotFound, resp.StatusCode)
	})

	t.Run("system admin can list all organizations and create new organization", func(t *testing.T) {
		resp := doAuthorizedRequest(t, server.URL, sysAdminToken, http.MethodGet, "/organizations", nil)
		defer resp.Body.Close()
		require.Equal(t, http.StatusOK, resp.StatusCode)

		var listResp apiorg.ListResponse
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&listResp))
		assert.Len(t, listResp.Data, 2)

		body, err := json.Marshal(map[string]string{"name": "Gamma", "domain": "gamma.example.com", "workspace": "gamma"})
		require.NoError(t, err)
		resp = doAuthorizedRequest(t, server.URL, sysAdminToken, http.MethodPost, "/organizations", bytes.NewReader(body))
		defer resp.Body.Close()
		require.Equal(t, http.StatusCreated, resp.StatusCode)
		var created apiorg.Response
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&created))
		assert.Equal(t, "/organizations/"+created.ID.String(), resp.Header.Get("Location"))
	})

	t.Run("regular user cannot create organization", func(t *testing.T) {
		body, err := json.Marshal(map[string]string{"name": "Delta", "domain": "delta.example.com", "workspace": "delta"})
		require.NoError(t, err)
		resp := doAuthorizedRequest(t, server.URL, regularToken, http.MethodPost, "/organizations", bytes.NewReader(body))
		defer resp.Body.Close()
		assert.Equal(t, http.StatusForbidden, resp.StatusCode)
	})

	t.Run("system admin can soft delete organization", func(t *testing.T) {
		resp := doAuthorizedRequest(t, server.URL, sysAdminToken, http.MethodDelete, "/organizations/"+orgB.ID.String(), nil)
		defer resp.Body.Close()
		require.Equal(t, http.StatusNoContent, resp.StatusCode)

		_, err := orgRepo.GetByID(ctx, orgB.ID)
		assert.ErrorIs(t, err, organization.ErrNotFound)
	})

	t.Run("deleted active organization invalidates tenant-scoped user routes", func(t *testing.T) {
		resp := doAuthorizedRequest(t, server.URL, regularToken, http.MethodDelete, "/organizations/"+orgA.ID.String(), nil)
		defer resp.Body.Close()
		require.Equal(t, http.StatusForbidden, resp.StatusCode)

		resp = doAuthorizedRequest(t, server.URL, sysAdminToken, http.MethodDelete, "/organizations/"+orgA.ID.String(), nil)
		defer resp.Body.Close()
		require.Equal(t, http.StatusNoContent, resp.StatusCode)

		resp = doAuthorizedRequest(t, server.URL, regularToken, http.MethodGet, "/users", nil)
		defer resp.Body.Close()
		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})
}

func TestOrganizationsIntegration_DeleteIsIdempotent(t *testing.T) {
	env := testutil.NewPostgresIntegrationEnv(t)
	ctx := context.Background()
	queries := sqlc.New(env.Pool)
	orgRepo := postgres.NewOrgRepository(queries)
	txManager := postgres.NewTxManager(env.Pool)
	logger := testutil.NewDiscardLogger()

	orgHandler := apiorg.NewHandler(
		apporg.NewCreateUseCase(orgRepo, logger),
		apporg.NewGetUseCase(orgRepo, logger),
		apporg.NewListUseCase(orgRepo, logger),
		apporg.NewUpdateUseCase(orgRepo, logger),
		apporg.NewDeleteUseCase(txManager, logger),
	)

	require.NoError(t, rbac.InitEnforcer(filepath.Join(env.BackendRoot, "policies", "model.conf"), filepath.Join(env.BackendRoot, "policies", "policy.csv")))
	router := rootapi.NewRouter(noopBootstrapHandler{}, &apiauth.Handler{}, orgHandler, &apiuser.Handler{}, &apiteam.Handler{}, rootapi.RouterConfig{
		Env:            "test",
		AllowedOrigins: []string{"http://localhost:3000"},
		OpenAPISpec:    apispec.Spec,
		JWTSecret:      "test-secret",
		Enforcer:       rbac.Enforcer(),
		Pool:           env.Pool,
		MaxBodySize:    1024 * 1024,
		RequestTimeout: 30 * time.Second,
	})
	server := httptest.NewServer(router)
	t.Cleanup(server.Close)

	org, err := orgRepo.Create(ctx, &organization.Organization{Name: "Gamma", Domain: "gamma.example.com", Workspace: "gamma", Status: organization.StatusActive})
	require.NoError(t, err)

	issuer := infraauth.NewTokenIssuer("test-secret")
	sysAdminToken, err := issuer.IssueToken(domain.UserClaims{UserID: domain.UserID(uuid.New()), IsSystemAdmin: true}, time.Hour)
	require.NoError(t, err)

	resp := doAuthorizedRequest(t, server.URL, sysAdminToken, http.MethodDelete, "/organizations/"+org.ID.String(), nil)
	defer resp.Body.Close()
	require.Equal(t, http.StatusNoContent, resp.StatusCode)

	resp2 := doAuthorizedRequest(t, server.URL, sysAdminToken, http.MethodDelete, "/organizations/"+org.ID.String(), nil)
	defer resp2.Body.Close()
	assert.Equal(t, http.StatusNoContent, resp2.StatusCode)
}

func doAuthorizedRequest(t *testing.T, baseURL, token, method, path string, body io.Reader) *http.Response {
	t.Helper()
	req, err := http.NewRequest(method, baseURL+path, body)
	require.NoError(t, err)
	req.Header.Set("Authorization", "Bearer "+token)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	return resp
}
