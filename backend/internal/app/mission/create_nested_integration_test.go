//go:build integration

package mission

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domainindicator "github.com/getbud-co/bud2/backend/internal/domain/indicator"
	domainmission "github.com/getbud-co/bud2/backend/internal/domain/mission"
	"github.com/getbud-co/bud2/backend/internal/domain/organization"
	domainuser "github.com/getbud-co/bud2/backend/internal/domain/user"
	"github.com/getbud-co/bud2/backend/internal/infra/postgres"
	"github.com/getbud-co/bud2/backend/internal/infra/postgres/sqlc"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

// Nested POST /missions creates the mission, its indicators, and its tasks in
// a single transaction. The test exercises both the happy path (everything
// commits) and the rollback path (a downstream child fails → mission is gone).
func TestCreateUseCase_Execute_Nested_CommitsEverything(t *testing.T) {
	env := testutil.NewPostgresIntegrationEnv(t)
	ctx := context.Background()
	queries := sqlc.New(env.Pool)
	orgRepo := postgres.NewOrgRepository(queries)
	userRepo := postgres.NewUserRepository(queries)
	missionRepo := postgres.NewMissionRepository(queries, env.Pool)
	indRepo := postgres.NewIndicatorRepository(queries)
	taskRepo := postgres.NewTaskRepository(queries)
	cycleRepo := postgres.NewCycleRepository(queries)
	teamRepo := postgres.NewTeamRepository(queries)
	txm := postgres.NewTxManager(env.Pool)

	org, err := orgRepo.Create(ctx, &organization.Organization{Name: "Nested A", Domain: "nested-a.example.com", Workspace: "nested-a", Status: organization.StatusActive})
	require.NoError(t, err)
	owner, err := userRepo.Create(ctx, &domainuser.User{
		ID: uuid.New(), FirstName: "Owner", LastName: "Nested",
		Email: "owner-nested@example.com", PasswordHash: "h", Status: domainuser.StatusActive, Language: "pt-br",
		Memberships: []organization.Membership{{OrganizationID: org.ID, Role: organization.MembershipRoleSuperAdmin, Status: organization.MembershipStatusActive}},
	})
	require.NoError(t, err)

	uc := NewCreateUseCase(missionRepo, cycleRepo, teamRepo, userRepo, txm, testutil.NewDiscardLogger())

	tenantID := domain.TenantID(org.ID)

	res, err := uc.Execute(ctx, CreateCommand{
		OrganizationID: tenantID,
		Title:          "Q4 OKRs",
		OwnerID:        owner.ID,
		Indicators: []CreateIndicatorInput{
			{Title: "Churn"},
			{Title: "NPS"},
		},
		Tasks: []CreateTaskInput{
			{Title: "Kickoff"},
		},
	})
	require.NoError(t, err)
	require.NotNil(t, res.Mission)
	assert.Len(t, res.Indicators, 2)
	assert.Len(t, res.Tasks, 1)

	// Verify everything is persisted with the right relationships.
	gotMission, err := missionRepo.GetByID(ctx, res.Mission.ID, org.ID)
	require.NoError(t, err)
	assert.Equal(t, "Q4 OKRs", gotMission.Title)

	gotInds, err := indRepo.List(ctx, domainindicator.ListFilter{OrganizationID: org.ID, MissionID: &res.Mission.ID})
	require.NoError(t, err)
	assert.Equal(t, int64(2), gotInds.Total)

	gotTasks, err := taskRepo.List(ctx, postgresTaskListFilter(org.ID, res.Mission.ID))
	require.NoError(t, err)
	assert.Equal(t, int64(1), gotTasks.Total)
}

func TestCreateUseCase_Execute_Nested_InvalidIndicatorOwner_RollsBackEverything(t *testing.T) {
	env := testutil.NewPostgresIntegrationEnv(t)
	ctx := context.Background()
	queries := sqlc.New(env.Pool)
	orgRepo := postgres.NewOrgRepository(queries)
	userRepo := postgres.NewUserRepository(queries)
	missionRepo := postgres.NewMissionRepository(queries, env.Pool)
	indRepo := postgres.NewIndicatorRepository(queries)
	taskRepo := postgres.NewTaskRepository(queries)
	cycleRepo := postgres.NewCycleRepository(queries)
	teamRepo := postgres.NewTeamRepository(queries)
	txm := postgres.NewTxManager(env.Pool)

	org, err := orgRepo.Create(ctx, &organization.Organization{Name: "Nested B", Domain: "nested-b.example.com", Workspace: "nested-b", Status: organization.StatusActive})
	require.NoError(t, err)
	owner, err := userRepo.Create(ctx, &domainuser.User{
		ID: uuid.New(), FirstName: "Owner", LastName: "Nested",
		Email: "owner-rollback@example.com", PasswordHash: "h", Status: domainuser.StatusActive, Language: "pt-br",
		Memberships: []organization.Membership{{OrganizationID: org.ID, Role: organization.MembershipRoleSuperAdmin, Status: organization.MembershipStatusActive}},
	})
	require.NoError(t, err)

	uc := NewCreateUseCase(missionRepo, cycleRepo, teamRepo, userRepo, txm, testutil.NewDiscardLogger())

	tenantID := domain.TenantID(org.ID)

	bogusOwner := uuid.New()
	_, err = uc.Execute(ctx, CreateCommand{
		OrganizationID: tenantID,
		Title:          "Should rollback",
		OwnerID:        owner.ID,
		Indicators: []CreateIndicatorInput{
			{Title: "valid"},
			{OwnerID: &bogusOwner, Title: "bogus owner — must reject before tx opens"},
		},
	})
	assert.ErrorIs(t, err, domainindicator.ErrInvalidReference)

	// Nothing persisted.
	listRes, err := missionRepo.List(ctx, domainmission.ListFilter{OrganizationID: org.ID})
	require.NoError(t, err)
	assert.Zero(t, listRes.Total, "mission must not be persisted when a child reference is invalid")

	indList, err := indRepo.List(ctx, domainindicator.ListFilter{OrganizationID: org.ID})
	require.NoError(t, err)
	assert.Zero(t, indList.Total)

	taskList, err := taskRepo.List(ctx, postgresTaskListFilterAll(org.ID))
	require.NoError(t, err)
	assert.Zero(t, taskList.Total)
}
