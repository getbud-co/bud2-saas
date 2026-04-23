//go:build integration

package user_test

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
	appuser "github.com/getbud-co/bud2/backend/internal/app/user"
	"github.com/getbud-co/bud2/backend/internal/domain"
	"github.com/getbud-co/bud2/backend/internal/domain/membership"
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

type listResponse struct {
	Data  []userResponse `json:"data"`
	Total int64          `json:"total"`
}

type userResponse struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Status    string `json:"status"`
}

type membershipResponse struct {
	OrganizationID string `json:"organization_id"`
	UserID         string `json:"user_id"`
	Role           string `json:"role"`
	Status         string `json:"status"`
}

func TestUsersIntegration_ListAndGet_RespectActiveOrganization(t *testing.T) {
	env := testutil.NewPostgresIntegrationEnv(t)
	ctx := context.Background()
	queries := sqlc.New(env.Pool)
	orgRepo := postgres.NewOrgRepository(queries)
	userRepo := postgres.NewUserRepository(queries)
	teamRepo := postgres.NewTeamRepository(queries)
	txManager := postgres.NewTxManager(env.Pool)
	logger := testutil.NewDiscardLogger()

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
	router := rootapi.NewRouter(noopBootstrapHandler{}, &apiauth.Handler{}, &apiorg.Handler{}, userHandler, &apiteam.Handler{}, rootapi.RouterConfig{
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

	userA, err := userRepo.Create(ctx, &user.User{
		ID:           uuid.New(),
		FirstName:    "Alpha",
		LastName:     "User",
		Email:        "alpha-user@example.com",
		PasswordHash: "hashed",
		Status:       user.StatusActive,
		Language:     "pt-br",
		Memberships: []membership.Membership{{
			OrganizationID: orgA.ID,
			Role:           membership.RoleSuperAdmin,
			Status:         membership.StatusActive,
		}},
	})
	require.NoError(t, err)
	userAColleague, err := userRepo.Create(ctx, &user.User{
		ID:           uuid.New(),
		FirstName:    "Alpha",
		LastName:     "Colleague",
		Email:        "alpha-colleague@example.com",
		PasswordHash: "hashed",
		Status:       user.StatusActive,
		Language:     "pt-br",
		Memberships: []membership.Membership{{
			OrganizationID: orgA.ID,
			Role:           membership.RoleColaborador,
			Status:         membership.StatusActive,
		}},
	})
	require.NoError(t, err)

	userB, err := userRepo.Create(ctx, &user.User{
		ID:           uuid.New(),
		FirstName:    "Beta",
		LastName:     "User",
		Email:        "beta-user@example.com",
		PasswordHash: "hashed",
		Status:       user.StatusActive,
		Language:     "pt-br",
		Memberships: []membership.Membership{{
			OrganizationID: orgB.ID,
			Role:           membership.RoleSuperAdmin,
			Status:         membership.StatusActive,
		}},
	})
	require.NoError(t, err)

	issuer := infraauth.NewTokenIssuer("test-secret")
	token, err := issuer.IssueToken(domain.UserClaims{
		UserID:                domain.UserID(userA.ID),
		ActiveOrganizationID:  domain.TenantID(orgA.ID),
		HasActiveOrganization: true,
		MembershipRole:        "super-admin",
	}, time.Hour)
	require.NoError(t, err)
	colleagueToken, err := issuer.IssueToken(domain.UserClaims{
		UserID:                domain.UserID(userAColleague.ID),
		ActiveOrganizationID:  domain.TenantID(orgA.ID),
		HasActiveOrganization: true,
		MembershipRole:        "colaborador",
	}, time.Hour)
	require.NoError(t, err)

	listResp := doAuthorizedRequest(t, server.URL, token, http.MethodGet, "/users")
	defer listResp.Body.Close()
	require.Equal(t, http.StatusOK, listResp.StatusCode)
	var listed listResponse
	require.NoError(t, json.NewDecoder(listResp.Body).Decode(&listed))
	require.Len(t, listed.Data, 2)
	assert.Equal(t, userA.ID.String(), listed.Data[0].ID)

	getResp := doAuthorizedRequest(t, server.URL, token, http.MethodGet, "/users/"+userB.ID.String())
	defer getResp.Body.Close()
	assert.Equal(t, http.StatusNotFound, getResp.StatusCode)

	updateBody, err := json.Marshal(map[string]string{
		"first_name": "Alpha",
		"last_name":  "Updated",
		"email":      "alpha-updated@example.com",
		"status":     "inactive",
	})
	require.NoError(t, err)
	updateResp := doAuthorizedRequestWithBody(t, server.URL, token, http.MethodPut, "/users/"+userA.ID.String(), bytes.NewReader(updateBody))
	defer updateResp.Body.Close()
	require.Equal(t, http.StatusOK, updateResp.StatusCode)
	var updated userResponse
	require.NoError(t, json.NewDecoder(updateResp.Body).Decode(&updated))
	assert.Equal(t, "Alpha", updated.FirstName)
	assert.Equal(t, "Updated", updated.LastName)
	assert.Equal(t, "alpha-updated@example.com", updated.Email)
	assert.Equal(t, "inactive", updated.Status)

	forbiddenUpdateResp := doAuthorizedRequestWithBody(t, server.URL, token, http.MethodPut, "/users/"+userB.ID.String(), bytes.NewReader(updateBody))
	defer forbiddenUpdateResp.Body.Close()
	assert.Equal(t, http.StatusNotFound, forbiddenUpdateResp.StatusCode)

	membershipResp := doAuthorizedRequest(t, server.URL, token, http.MethodGet, "/users/"+userA.ID.String()+"/membership")
	defer membershipResp.Body.Close()
	require.Equal(t, http.StatusOK, membershipResp.StatusCode)
	var membershipBody membershipResponse
	require.NoError(t, json.NewDecoder(membershipResp.Body).Decode(&membershipBody))
	assert.Equal(t, orgA.ID.String(), membershipBody.OrganizationID)
	assert.Equal(t, userA.ID.String(), membershipBody.UserID)
	assert.Equal(t, "super-admin", membershipBody.Role)

	inaccessibleMembershipResp := doAuthorizedRequest(t, server.URL, token, http.MethodGet, "/users/"+userB.ID.String()+"/membership")
	defer inaccessibleMembershipResp.Body.Close()
	assert.Equal(t, http.StatusNotFound, inaccessibleMembershipResp.StatusCode)

	updateMembershipBody, err := json.Marshal(map[string]string{
		"role":   "super-admin",
		"status": "active",
	})
	require.NoError(t, err)
	updateMembershipResp := doAuthorizedRequestWithBody(t, server.URL, token, http.MethodPut, "/users/"+userA.ID.String()+"/membership", bytes.NewReader(updateMembershipBody))
	defer updateMembershipResp.Body.Close()
	require.Equal(t, http.StatusOK, updateMembershipResp.StatusCode)
	var updatedMembership membershipResponse
	require.NoError(t, json.NewDecoder(updateMembershipResp.Body).Decode(&updatedMembership))
	assert.Equal(t, "super-admin", updatedMembership.Role)
	assert.Equal(t, "active", updatedMembership.Status)

	forbiddenMembershipUpdateResp := doAuthorizedRequestWithBody(t, server.URL, token, http.MethodPut, "/users/"+userB.ID.String()+"/membership", bytes.NewReader(updateMembershipBody))
	defer forbiddenMembershipUpdateResp.Body.Close()
	assert.Equal(t, http.StatusNotFound, forbiddenMembershipUpdateResp.StatusCode)

	deleteResp := doAuthorizedRequest(t, server.URL, token, http.MethodDelete, "/users/"+userA.ID.String())
	defer deleteResp.Body.Close()
	require.Equal(t, http.StatusForbidden, deleteResp.StatusCode)

	deleteOtherResp := doAuthorizedRequest(t, server.URL, token, http.MethodDelete, "/users/"+userB.ID.String())
	defer deleteOtherResp.Body.Close()
	require.Equal(t, http.StatusNoContent, deleteOtherResp.StatusCode)

	deleteColleagueResp := doAuthorizedRequest(t, server.URL, token, http.MethodDelete, "/users/"+userAColleague.ID.String())
	defer deleteColleagueResp.Body.Close()
	require.Equal(t, http.StatusNoContent, deleteColleagueResp.StatusCode)

	staleTokenResp := doAuthorizedRequest(t, server.URL, colleagueToken, http.MethodGet, "/users")
	defer staleTokenResp.Body.Close()
	assert.Equal(t, http.StatusUnauthorized, staleTokenResp.StatusCode)
}

func TestUsersIntegration_CreateIncludesLocation(t *testing.T) {
	env := testutil.NewPostgresIntegrationEnv(t)
	ctx := context.Background()
	queries := sqlc.New(env.Pool)
	orgRepo := postgres.NewOrgRepository(queries)
	userRepo := postgres.NewUserRepository(queries)
	teamRepo := postgres.NewTeamRepository(queries)
	txManager := postgres.NewTxManager(env.Pool)
	logger := testutil.NewDiscardLogger()

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
	router := rootapi.NewRouter(noopBootstrapHandler{}, &apiauth.Handler{}, &apiorg.Handler{}, userHandler, &apiteam.Handler{}, rootapi.RouterConfig{
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

	org, err := orgRepo.Create(ctx, &organization.Organization{Name: "Zeta", Domain: "zeta.example.com", Workspace: "zeta", Status: organization.StatusActive})
	require.NoError(t, err)

	adminUser, err := userRepo.Create(ctx, &user.User{
		ID:           uuid.New(),
		FirstName:    "Admin",
		LastName:     "User",
		Email:        "admin@zeta.example.com",
		PasswordHash: "hashed",
		Status:       user.StatusActive,
		Language:     "pt-br",
		Memberships: []membership.Membership{{
			OrganizationID: org.ID,
			Role:           membership.RoleSuperAdmin,
			Status:         membership.StatusActive,
		}},
	})
	require.NoError(t, err)

	issuer := infraauth.NewTokenIssuer("test-secret")
	token, err := issuer.IssueToken(domain.UserClaims{
		UserID:                domain.UserID(adminUser.ID),
		ActiveOrganizationID:  domain.TenantID(org.ID),
		HasActiveOrganization: true,
		MembershipRole:        "super-admin",
	}, time.Hour)
	require.NoError(t, err)

	body, err := json.Marshal(map[string]string{
		"first_name": "Test",
		"last_name":  "User",
		"email":      "test@zeta.example.com",
		"password":   "password123",
		"role":       "colaborador",
	})
	require.NoError(t, err)

	resp := doAuthorizedRequestWithBody(t, server.URL, token, http.MethodPost, "/users", bytes.NewReader(body))
	defer resp.Body.Close()
	require.Equal(t, http.StatusCreated, resp.StatusCode)

	var created apiuser.Response
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&created))
	assert.Equal(t, "/users/"+created.ID, resp.Header.Get("Location"))
}

func TestUsersIntegration_DeleteIsIdempotent(t *testing.T) {
	env := testutil.NewPostgresIntegrationEnv(t)
	ctx := context.Background()
	queries := sqlc.New(env.Pool)
	orgRepo := postgres.NewOrgRepository(queries)
	userRepo := postgres.NewUserRepository(queries)
	teamRepo := postgres.NewTeamRepository(queries)
	txManager := postgres.NewTxManager(env.Pool)
	logger := testutil.NewDiscardLogger()

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
	router := rootapi.NewRouter(noopBootstrapHandler{}, &apiauth.Handler{}, &apiorg.Handler{}, userHandler, &apiteam.Handler{}, rootapi.RouterConfig{
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

	org, err := orgRepo.Create(ctx, &organization.Organization{Name: "Delta", Domain: "delta.example.com", Workspace: "delta", Status: organization.StatusActive})
	require.NoError(t, err)

	adminUser, err := userRepo.Create(ctx, &user.User{
		ID:           uuid.New(),
		FirstName:    "Admin",
		LastName:     "User",
		Email:        "admin@delta.example.com",
		PasswordHash: "hashed",
		Status:       user.StatusActive,
		Language:     "pt-br",
		Memberships: []membership.Membership{{
			OrganizationID: org.ID,
			Role:           membership.RoleSuperAdmin,
			Status:         membership.StatusActive,
		}},
	})
	require.NoError(t, err)

	memberUser, err := userRepo.Create(ctx, &user.User{
		ID:           uuid.New(),
		FirstName:    "Member",
		LastName:     "User",
		Email:        "member@delta.example.com",
		PasswordHash: "hashed",
		Status:       user.StatusActive,
		Language:     "pt-br",
		Memberships: []membership.Membership{{
			OrganizationID: org.ID,
			Role:           membership.RoleColaborador,
			Status:         membership.StatusActive,
		}},
	})
	require.NoError(t, err)

	issuer := infraauth.NewTokenIssuer("test-secret")
	token, err := issuer.IssueToken(domain.UserClaims{
		UserID:                domain.UserID(adminUser.ID),
		ActiveOrganizationID:  domain.TenantID(org.ID),
		HasActiveOrganization: true,
		MembershipRole:        "super-admin",
	}, time.Hour)
	require.NoError(t, err)

	resp := doAuthorizedRequestWithBody(t, server.URL, token, http.MethodDelete, "/users/"+memberUser.ID.String(), nil)
	defer resp.Body.Close()
	require.Equal(t, http.StatusNoContent, resp.StatusCode)

	resp2 := doAuthorizedRequestWithBody(t, server.URL, token, http.MethodDelete, "/users/"+memberUser.ID.String(), nil)
	defer resp2.Body.Close()
	assert.Equal(t, http.StatusNoContent, resp2.StatusCode)
}

func doAuthorizedRequest(t *testing.T, baseURL, token, method, path string) *http.Response {
	t.Helper()
	return doAuthorizedRequestWithBody(t, baseURL, token, method, path, nil)
}

func doAuthorizedRequestWithBody(t *testing.T, baseURL, token, method, path string, body io.Reader) *http.Response {
	t.Helper()
	req, err := http.NewRequest(method, baseURL+path, body)
	require.NoError(t, err)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("X-Forwarded-For", uuid.NewString())
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	return resp
}
