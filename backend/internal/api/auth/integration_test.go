//go:build integration

package auth_test

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
	appauth "github.com/getbud-co/bud2/backend/internal/app/auth"
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

type authResponse struct {
	AccessToken        string                 `json:"access_token"`
	RefreshToken       string                 `json:"refresh_token"`
	TokenType          string                 `json:"token_type"`
	ActiveOrganization *organizationResponse  `json:"active_organization"`
	Organizations      []organizationResponse `json:"organizations"`
	User               userResponse           `json:"user"`
}

type organizationResponse struct {
	ID             string `json:"id"`
	Domain         string `json:"domain"`
	MembershipRole string `json:"membership_role"`
}

type userResponse struct {
	ID            string `json:"id"`
	Email         string `json:"email"`
	IsSystemAdmin bool   `json:"is_system_admin"`
}

type problemResponse struct {
	Title  string `json:"title"`
	Status int    `json:"status"`
	Detail string `json:"detail"`
}

func TestAuthIntegration_LoginSessionSwitchRefresh(t *testing.T) {
	env := testutil.NewPostgresIntegrationEnv(t)
	ctx := context.Background()
	queries := sqlc.New(env.Pool)
	orgRepo := postgres.NewOrgRepository(queries)
	userRepo := postgres.NewUserRepository(queries)
	refreshRepo := postgres.NewRefreshTokenRepository(queries)
	logger := testutil.NewDiscardLogger()
	issuer := infraauth.NewTokenIssuer("test-secret")
	passwordHasher := infraauth.NewDefaultBcryptPasswordHasher()
	tokenHasher := infraauth.NewSHA256TokenHasher()

	authHandler := apiauth.NewHandler(
		appauth.NewLoginUseCase(userRepo, orgRepo, issuer, passwordHasher, refreshRepo, tokenHasher, logger),
		appauth.NewGetSessionUseCase(userRepo, orgRepo, issuer, passwordHasher, logger),
		appauth.NewSwitchOrganizationUseCase(userRepo, orgRepo, issuer, passwordHasher, refreshRepo, tokenHasher, logger),
		appauth.NewRefreshUseCase(userRepo, orgRepo, issuer, passwordHasher, refreshRepo, tokenHasher, logger),
	)

	require.NoError(t, rbac.InitEnforcer(filepath.Join(env.BackendRoot, "policies", "model.conf"), filepath.Join(env.BackendRoot, "policies", "policy.csv")))
	router := rootapi.NewRouter(noopBootstrapHandler{}, authHandler, &apiorg.Handler{}, &apiuser.Handler{}, &apiteam.Handler{}, rootapi.RouterConfig{
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

	orgAlpha, err := orgRepo.Create(ctx, &organization.Organization{Name: "Alpha", Domain: "alpha.example.com", Workspace: "alpha", Status: organization.StatusActive})
	require.NoError(t, err)
	orgBeta, err := orgRepo.Create(ctx, &organization.Organization{Name: "Beta", Domain: "beta.example.com", Workspace: "beta", Status: organization.StatusActive})
	require.NoError(t, err)

	hash, err := passwordHasher.Hash("password123")
	require.NoError(t, err)
	createdUser, err := userRepo.Create(ctx, &user.User{
		ID:           uuid.New(),
		FirstName:    "Regular",
		LastName:     "User",
		Email:        "member@alpha.example.com",
		PasswordHash: hash,
		Status:       user.StatusActive,
		Language:     "pt-br",
		Memberships: []membership.Membership{
			{OrganizationID: orgAlpha.ID, Role: membership.RoleSuperAdmin, Status: membership.StatusActive},
			{OrganizationID: orgBeta.ID, Role: membership.RoleGestor, Status: membership.StatusActive},
		},
	})
	require.NoError(t, err)

	loginBody, err := json.Marshal(map[string]string{"email": createdUser.Email, "password": "password123"})
	require.NoError(t, err)
	loginResp := doJSONRequest(t, server.URL, http.MethodPost, "/auth/login", "", bytes.NewReader(loginBody))
	defer loginResp.Body.Close()
	require.Equal(t, http.StatusOK, loginResp.StatusCode)

	var login authResponse
	require.NoError(t, json.NewDecoder(loginResp.Body).Decode(&login))
	require.NotEmpty(t, login.AccessToken)
	require.NotEmpty(t, login.RefreshToken)
	require.NotNil(t, login.ActiveOrganization)
	assert.Equal(t, orgAlpha.ID.String(), login.ActiveOrganization.ID)
	assert.Len(t, login.Organizations, 2)

	sessionResp := doJSONRequest(t, server.URL, http.MethodGet, "/auth/session", login.AccessToken, nil)
	defer sessionResp.Body.Close()
	require.Equal(t, http.StatusOK, sessionResp.StatusCode)

	var session authResponse
	require.NoError(t, json.NewDecoder(sessionResp.Body).Decode(&session))
	require.NotNil(t, session.ActiveOrganization)
	assert.Equal(t, orgAlpha.ID.String(), session.ActiveOrganization.ID)

	switchBody, err := json.Marshal(map[string]string{"organization_id": orgBeta.ID.String()})
	require.NoError(t, err)
	switchResp := doJSONRequest(t, server.URL, http.MethodPut, "/auth/session", login.AccessToken, bytes.NewReader(switchBody))
	defer switchResp.Body.Close()
	require.Equal(t, http.StatusOK, switchResp.StatusCode)

	var switched authResponse
	require.NoError(t, json.NewDecoder(switchResp.Body).Decode(&switched))
	require.NotNil(t, switched.ActiveOrganization)
	assert.Equal(t, orgBeta.ID.String(), switched.ActiveOrganization.ID)
	require.NotEmpty(t, switched.RefreshToken)

	refreshBody, err := json.Marshal(map[string]string{"refresh_token": switched.RefreshToken})
	require.NoError(t, err)
	refreshResp := doJSONRequest(t, server.URL, http.MethodPost, "/auth/refresh", "", bytes.NewReader(refreshBody))
	defer refreshResp.Body.Close()
	require.Equal(t, http.StatusOK, refreshResp.StatusCode)

	var refreshed authResponse
	require.NoError(t, json.NewDecoder(refreshResp.Body).Decode(&refreshed))
	require.NotNil(t, refreshed.ActiveOrganization)
	assert.Equal(t, orgBeta.ID.String(), refreshed.ActiveOrganization.ID)
	require.NotEmpty(t, refreshed.AccessToken)
	require.NotEqual(t, switched.RefreshToken, refreshed.RefreshToken)

	refreshedSessionResp := doJSONRequest(t, server.URL, http.MethodGet, "/auth/session", refreshed.AccessToken, nil)
	defer refreshedSessionResp.Body.Close()
	require.Equal(t, http.StatusOK, refreshedSessionResp.StatusCode)

	var refreshedSession authResponse
	require.NoError(t, json.NewDecoder(refreshedSessionResp.Body).Decode(&refreshedSession))
	require.NotNil(t, refreshedSession.ActiveOrganization)
	assert.Equal(t, orgBeta.ID.String(), refreshedSession.ActiveOrganization.ID)

	reuseBody, err := json.Marshal(map[string]string{"refresh_token": switched.RefreshToken})
	require.NoError(t, err)
	reuseResp := doJSONRequest(t, server.URL, http.MethodPost, "/auth/refresh", "", bytes.NewReader(reuseBody))
	defer reuseResp.Body.Close()
	require.Equal(t, http.StatusUnauthorized, reuseResp.StatusCode)

	var problem problemResponse
	require.NoError(t, json.NewDecoder(reuseResp.Body).Decode(&problem))
	assert.Contains(t, problem.Detail, "refresh token")
}

// TestAuthIntegration_InvitedUser_LoginActivatesMemberships verifies that a user
// with membership status='invited' can log in successfully and that the membership
// is automatically promoted to status='active' on first login.
func TestAuthIntegration_InvitedUser_LoginActivatesMemberships(t *testing.T) {
	env := testutil.NewPostgresIntegrationEnv(t)
	ctx := context.Background()
	queries := sqlc.New(env.Pool)
	orgRepo := postgres.NewOrgRepository(queries)
	userRepo := postgres.NewUserRepository(queries)
	refreshRepo := postgres.NewRefreshTokenRepository(queries)
	logger := testutil.NewDiscardLogger()
	issuer := infraauth.NewTokenIssuer("test-secret")
	passwordHasher := infraauth.NewDefaultBcryptPasswordHasher()
	tokenHasher := infraauth.NewSHA256TokenHasher()

	authHandler := apiauth.NewHandler(
		appauth.NewLoginUseCase(userRepo, orgRepo, issuer, passwordHasher, refreshRepo, tokenHasher, logger),
		appauth.NewGetSessionUseCase(userRepo, orgRepo, issuer, passwordHasher, logger),
		appauth.NewSwitchOrganizationUseCase(userRepo, orgRepo, issuer, passwordHasher, refreshRepo, tokenHasher, logger),
		appauth.NewRefreshUseCase(userRepo, orgRepo, issuer, passwordHasher, refreshRepo, tokenHasher, logger),
	)

	require.NoError(t, rbac.InitEnforcer(filepath.Join(env.BackendRoot, "policies", "model.conf"), filepath.Join(env.BackendRoot, "policies", "policy.csv")))
	router := rootapi.NewRouter(noopBootstrapHandler{}, authHandler, &apiorg.Handler{}, &apiuser.Handler{}, &apiteam.Handler{}, rootapi.RouterConfig{
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

	org, err := orgRepo.Create(ctx, &organization.Organization{Name: "Invited Org", Domain: "invited.example.com", Workspace: "invited", Status: organization.StatusActive})
	require.NoError(t, err)

	hash, err := passwordHasher.Hash("invite123")
	require.NoError(t, err)
	invitedUser, err := userRepo.Create(ctx, &user.User{
		ID:           uuid.New(),
		FirstName:    "Invited",
		LastName:     "Member",
		Email:        "invited@invited.example.com",
		PasswordHash: hash,
		Status:       user.StatusActive,
		Language:     "pt-br",
		Memberships: []membership.Membership{
			{OrganizationID: org.ID, Role: membership.RoleColaborador, Status: membership.StatusInvited},
		},
	})
	require.NoError(t, err)

	// Verify membership starts as 'invited'
	reloaded, err := userRepo.GetByID(ctx, invitedUser.ID)
	require.NoError(t, err)
	require.Len(t, reloaded.Memberships, 1)
	assert.Equal(t, membership.StatusInvited, reloaded.Memberships[0].Status)

	// First login should succeed and activate the membership
	loginBody, err := json.Marshal(map[string]string{"email": invitedUser.Email, "password": "invite123"})
	require.NoError(t, err)
	loginResp := doJSONRequest(t, server.URL, http.MethodPost, "/auth/login", "", bytes.NewReader(loginBody))
	defer loginResp.Body.Close()
	require.Equal(t, http.StatusOK, loginResp.StatusCode)

	var login authResponse
	require.NoError(t, json.NewDecoder(loginResp.Body).Decode(&login))
	require.NotEmpty(t, login.AccessToken)
	require.NotNil(t, login.ActiveOrganization)
	assert.Equal(t, org.ID.String(), login.ActiveOrganization.ID)

	// Verify membership is now 'active' in the database
	reloadedAfter, err := userRepo.GetByID(ctx, invitedUser.ID)
	require.NoError(t, err)
	require.Len(t, reloadedAfter.Memberships, 1)
	assert.Equal(t, membership.StatusActive, reloadedAfter.Memberships[0].Status)
}

func doJSONRequest(t *testing.T, baseURL, method, path, token string, body io.Reader) *http.Response {
	t.Helper()
	req, err := http.NewRequest(method, baseURL+path, body)
	require.NoError(t, err)
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	req.Header.Set("X-Forwarded-For", uuid.NewString())
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	return resp
}
