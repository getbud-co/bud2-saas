//go:build integration

package team_test

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
	appteam "github.com/getbud-co/bud2/backend/internal/app/team"
	appuser "github.com/getbud-co/bud2/backend/internal/app/user"
	"github.com/getbud-co/bud2/backend/internal/domain"
	"github.com/getbud-co/bud2/backend/internal/domain/membership"
	"github.com/getbud-co/bud2/backend/internal/domain/organization"
	"github.com/getbud-co/bud2/backend/internal/domain/team"
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

type teamListResponse struct {
	Data  []teamResponse `json:"data"`
	Total int64          `json:"total"`
	Page  int            `json:"page"`
	Size  int            `json:"size"`
}

type teamResponse struct {
	ID          string           `json:"id"`
	Name        string           `json:"name"`
	OrgID       string           `json:"org_id"`
	Status      string           `json:"status"`
	MemberCount int              `json:"member_count"`
	Members     []teamMemberBody `json:"members"`
}

type teamMemberBody struct {
	UserID     string `json:"user_id"`
	RoleInTeam string `json:"role_in_team"`
}

type problemResponse struct {
	Title  string `json:"title"`
	Status int    `json:"status"`
	Detail string `json:"detail"`
}

func TestTeamsIntegration_CreateRejectsInactiveMembership(t *testing.T) {
	env := testutil.NewPostgresIntegrationEnv(t)
	ctx := context.Background()
	queries := sqlc.New(env.Pool)
	orgRepo := postgres.NewOrgRepository(queries)
	userRepo := postgres.NewUserRepository(queries)
	teamRepo := postgres.NewTeamRepository(queries)
	txManager := postgres.NewTxManager(env.Pool)
	logger := testutil.NewDiscardLogger()

	teamHandler := apiteam.NewHandler(
		appteam.NewCreateUseCase(teamRepo, userRepo, txManager, logger),
		appteam.NewGetUseCase(teamRepo, logger),
		appteam.NewListUseCase(teamRepo, logger),
		appteam.NewUpdateUseCase(teamRepo, userRepo, txManager, logger),
		appteam.NewDeleteUseCase(txManager, logger),
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
	router := rootapi.NewRouter(noopBootstrapHandler{}, &apiauth.Handler{}, &apiorg.Handler{}, userHandler, teamHandler, rootapi.RouterConfig{
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

	adminUser, err := userRepo.Create(ctx, &user.User{
		ID:           uuid.New(),
		FirstName:    "Admin",
		LastName:     "User",
		Email:        "admin@alpha.example.com",
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

	inactiveUser, err := userRepo.Create(ctx, &user.User{
		ID:           uuid.New(),
		FirstName:    "Inactive",
		LastName:     "Member",
		Email:        "inactive@alpha.example.com",
		PasswordHash: "hashed",
		Status:       user.StatusActive,
		Language:     "pt-br",
		Memberships: []membership.Membership{{
			OrganizationID: orgA.ID,
			Role:           membership.RoleColaborador,
			Status:         membership.StatusInactive,
		}},
	})
	require.NoError(t, err)

	token := issueOrgToken(t, adminUser.ID, orgA.ID, "super-admin")
	body, err := json.Marshal(map[string]any{
		"name":  "Ops Team",
		"color": "neutral",
		"members": []map[string]string{{
			"user_id":      inactiveUser.ID.String(),
			"role_in_team": "leader",
		}},
	})
	require.NoError(t, err)

	resp := doAuthorizedRequestWithBody(t, server.URL, token, http.MethodPost, "/teams", bytes.NewReader(body))
	defer resp.Body.Close()
	require.Equal(t, http.StatusUnprocessableEntity, resp.StatusCode)

	var problem problemResponse
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&problem))
	assert.Contains(t, problem.Detail, "active membership")
}

func TestTeamsIntegration_ListAndGetReflectMembershipCleanup(t *testing.T) {
	env := testutil.NewPostgresIntegrationEnv(t)
	ctx := context.Background()
	queries := sqlc.New(env.Pool)
	orgRepo := postgres.NewOrgRepository(queries)
	userRepo := postgres.NewUserRepository(queries)
	teamRepo := postgres.NewTeamRepository(queries)
	txManager := postgres.NewTxManager(env.Pool)
	logger := testutil.NewDiscardLogger()

	teamHandler := apiteam.NewHandler(
		appteam.NewCreateUseCase(teamRepo, userRepo, txManager, logger),
		appteam.NewGetUseCase(teamRepo, logger),
		appteam.NewListUseCase(teamRepo, logger),
		appteam.NewUpdateUseCase(teamRepo, userRepo, txManager, logger),
		appteam.NewDeleteUseCase(txManager, logger),
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
	router := rootapi.NewRouter(noopBootstrapHandler{}, &apiauth.Handler{}, &apiorg.Handler{}, userHandler, teamHandler, rootapi.RouterConfig{
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

	adminUser, err := userRepo.Create(ctx, &user.User{
		ID:           uuid.New(),
		FirstName:    "Admin",
		LastName:     "User",
		Email:        "admin-2@alpha.example.com",
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

	memberUser, err := userRepo.Create(ctx, &user.User{
		ID:           uuid.New(),
		FirstName:    "Member",
		LastName:     "User",
		Email:        "member@alpha.example.com",
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

	created, err := teamRepo.Create(ctx, &team.Team{
		ID:             uuid.New(),
		OrganizationID: orgA.ID,
		Name:           "People Ops",
		Color:          team.ColorNeutral,
		Status:         team.StatusActive,
		Members: []team.TeamMember{{
			UserID:     memberUser.ID,
			RoleInTeam: team.RoleLeader,
		}},
	})
	require.NoError(t, err)

	token := issueOrgToken(t, adminUser.ID, orgA.ID, "super-admin")
	getResp := doAuthorizedRequest(t, server.URL, token, http.MethodGet, "/teams/"+created.ID.String())
	defer getResp.Body.Close()
	require.Equal(t, http.StatusOK, getResp.StatusCode)

	var before teamResponse
	require.NoError(t, json.NewDecoder(getResp.Body).Decode(&before))
	require.Len(t, before.Members, 1)
	assert.Equal(t, 1, before.MemberCount)

	updateMembershipBody, err := json.Marshal(map[string]string{
		"role":   "colaborador",
		"status": "inactive",
	})
	require.NoError(t, err)
	updateMembershipResp := doAuthorizedRequestWithBody(t, server.URL, token, http.MethodPut, "/users/"+memberUser.ID.String()+"/membership", bytes.NewReader(updateMembershipBody))
	defer updateMembershipResp.Body.Close()
	require.Equal(t, http.StatusOK, updateMembershipResp.StatusCode)

	listResp := doAuthorizedRequest(t, server.URL, token, http.MethodGet, "/teams")
	defer listResp.Body.Close()
	require.Equal(t, http.StatusOK, listResp.StatusCode)

	var listed teamListResponse
	require.NoError(t, json.NewDecoder(listResp.Body).Decode(&listed))
	require.Len(t, listed.Data, 1)
	assert.Equal(t, 0, listed.Data[0].MemberCount)
	assert.Empty(t, listed.Data[0].Members)

	getAfterResp := doAuthorizedRequest(t, server.URL, token, http.MethodGet, "/teams/"+created.ID.String())
	defer getAfterResp.Body.Close()
	require.Equal(t, http.StatusOK, getAfterResp.StatusCode)

	var after teamResponse
	require.NoError(t, json.NewDecoder(getAfterResp.Body).Decode(&after))
	assert.Equal(t, 0, after.MemberCount)
	assert.Empty(t, after.Members)
}

func TestTeamsIntegration_CreateIncludesLocation(t *testing.T) {
	env := testutil.NewPostgresIntegrationEnv(t)
	ctx := context.Background()
	queries := sqlc.New(env.Pool)
	orgRepo := postgres.NewOrgRepository(queries)
	userRepo := postgres.NewUserRepository(queries)
	teamRepo := postgres.NewTeamRepository(queries)
	txManager := postgres.NewTxManager(env.Pool)
	logger := testutil.NewDiscardLogger()

	teamHandler := apiteam.NewHandler(
		appteam.NewCreateUseCase(teamRepo, userRepo, txManager, logger),
		appteam.NewGetUseCase(teamRepo, logger),
		appteam.NewListUseCase(teamRepo, logger),
		appteam.NewUpdateUseCase(teamRepo, userRepo, txManager, logger),
		appteam.NewDeleteUseCase(txManager, logger),
	)

	require.NoError(t, rbac.InitEnforcer(filepath.Join(env.BackendRoot, "policies", "model.conf"), filepath.Join(env.BackendRoot, "policies", "policy.csv")))
	router := rootapi.NewRouter(noopBootstrapHandler{}, &apiauth.Handler{}, &apiorg.Handler{}, &apiuser.Handler{}, teamHandler, rootapi.RouterConfig{
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

	org, err := orgRepo.Create(ctx, &organization.Organization{Name: "Eta", Domain: "eta.example.com", Workspace: "eta", Status: organization.StatusActive})
	require.NoError(t, err)

	adminUser, err := userRepo.Create(ctx, &user.User{
		ID:           uuid.New(),
		FirstName:    "Admin",
		LastName:     "User",
		Email:        "admin@eta.example.com",
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

	token := issueOrgToken(t, adminUser.ID, org.ID, "super-admin")

	body, err := json.Marshal(map[string]string{"name": "Design", "color": "orange"})
	require.NoError(t, err)

	resp := doAuthorizedRequestWithBody(t, server.URL, token, http.MethodPost, "/teams", bytes.NewReader(body))
	defer resp.Body.Close()
	require.Equal(t, http.StatusCreated, resp.StatusCode)

	var created apiteam.Response
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&created))
	assert.Equal(t, "/teams/"+created.ID, resp.Header.Get("Location"))
}

func TestTeamsIntegration_DeleteIsIdempotent(t *testing.T) {
	env := testutil.NewPostgresIntegrationEnv(t)
	ctx := context.Background()
	queries := sqlc.New(env.Pool)
	orgRepo := postgres.NewOrgRepository(queries)
	userRepo := postgres.NewUserRepository(queries)
	teamRepo := postgres.NewTeamRepository(queries)
	txManager := postgres.NewTxManager(env.Pool)
	logger := testutil.NewDiscardLogger()

	teamHandler := apiteam.NewHandler(
		appteam.NewCreateUseCase(teamRepo, userRepo, txManager, logger),
		appteam.NewGetUseCase(teamRepo, logger),
		appteam.NewListUseCase(teamRepo, logger),
		appteam.NewUpdateUseCase(teamRepo, userRepo, txManager, logger),
		appteam.NewDeleteUseCase(txManager, logger),
	)

	require.NoError(t, rbac.InitEnforcer(filepath.Join(env.BackendRoot, "policies", "model.conf"), filepath.Join(env.BackendRoot, "policies", "policy.csv")))
	router := rootapi.NewRouter(noopBootstrapHandler{}, &apiauth.Handler{}, &apiorg.Handler{}, &apiuser.Handler{}, teamHandler, rootapi.RouterConfig{
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

	org, err := orgRepo.Create(ctx, &organization.Organization{Name: "Epsilon", Domain: "epsilon.example.com", Workspace: "epsilon", Status: organization.StatusActive})
	require.NoError(t, err)

	adminUser, err := userRepo.Create(ctx, &user.User{
		ID:           uuid.New(),
		FirstName:    "Admin",
		LastName:     "User",
		Email:        "admin@epsilon.example.com",
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
		Email:        "member@epsilon.example.com",
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

	created, err := teamRepo.Create(ctx, &team.Team{
		ID:             uuid.New(),
		OrganizationID: org.ID,
		Name:           "Engineering",
		Color:          team.ColorNeutral,
		Status:         team.StatusActive,
		Members: []team.TeamMember{{
			UserID:     memberUser.ID,
			RoleInTeam: team.RoleLeader,
		}},
	})
	require.NoError(t, err)

	token := issueOrgToken(t, adminUser.ID, org.ID, "super-admin")

	resp := doAuthorizedRequest(t, server.URL, token, http.MethodDelete, "/teams/"+created.ID.String())
	defer resp.Body.Close()
	require.Equal(t, http.StatusNoContent, resp.StatusCode)

	resp2 := doAuthorizedRequest(t, server.URL, token, http.MethodDelete, "/teams/"+created.ID.String())
	defer resp2.Body.Close()
	assert.Equal(t, http.StatusNoContent, resp2.StatusCode)
}

func issueOrgToken(t *testing.T, userID, organizationID uuid.UUID, membershipRole string) string {
	t.Helper()
	issuer := infraauth.NewTokenIssuer("test-secret")
	token, err := issuer.IssueToken(domain.UserClaims{
		UserID:                domain.UserID(userID),
		ActiveOrganizationID:  domain.TenantID(organizationID),
		HasActiveOrganization: true,
		MembershipRole:        membershipRole,
	}, time.Hour)
	require.NoError(t, err)
	return token
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
