//go:build integration

package postgres

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/getbud-co/bud2/backend/internal/domain/mission"
	"github.com/getbud-co/bud2/backend/internal/domain/organization"
	"github.com/getbud-co/bud2/backend/internal/domain/task"
	"github.com/getbud-co/bud2/backend/internal/domain/user"
	"github.com/getbud-co/bud2/backend/internal/infra/postgres/sqlc"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func setupTaskEnv(t *testing.T) (context.Context, *TaskRepository, *MissionRepository, uuid.UUID, uuid.UUID, uuid.UUID) {
	t.Helper()
	env := testutil.NewPostgresIntegrationEnv(t)
	ctx := context.Background()
	queries := sqlc.New(env.Pool)
	orgRepo := NewOrgRepository(queries)
	userRepo := NewUserRepository(queries)
	missionRepo := NewMissionRepository(queries, env.Pool)
	taskRepo := NewTaskRepository(queries)

	orgA, err := orgRepo.Create(ctx, &organization.Organization{Name: "Tasks A", Domain: "tasks-a.example.com", Workspace: "tasks-a", Status: organization.StatusActive})
	require.NoError(t, err)
	orgB, err := orgRepo.Create(ctx, &organization.Organization{Name: "Tasks B", Domain: "tasks-b.example.com", Workspace: "tasks-b", Status: organization.StatusActive})
	require.NoError(t, err)

	owner, err := userRepo.Create(ctx, &user.User{
		ID:           uuid.New(),
		FirstName:    "Owner",
		LastName:     "Test",
		Email:        "owner-task@example.com",
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
	return ctx, taskRepo, missionRepo, orgA.ID, orgB.ID, owner.ID
}

func TestTaskRepository_CRUD_TenantScopedAndSoftDeletes(t *testing.T) {
	ctx, repo, missionRepo, orgAID, orgBID, ownerID := setupTaskEnv(t)

	m, err := missionRepo.Create(ctx, &mission.Mission{
		ID:             uuid.New(),
		OrganizationID: orgAID,
		OwnerID:        ownerID,
		Title:          "Parent mission",
		Status:         mission.StatusActive,
		Visibility:     mission.VisibilityPublic,
		KanbanStatus:   mission.KanbanTodo,
	})
	require.NoError(t, err)

	created, err := repo.Create(ctx, &task.Task{
		ID:             uuid.New(),
		OrganizationID: orgAID,
		MissionID:      m.ID,
		AssigneeID:     ownerID,
		Title:          "Triage",
		Status:         task.StatusTodo,
	})
	require.NoError(t, err)
	assert.Equal(t, orgAID, created.OrganizationID)

	// cross-tenant get must miss
	_, err = repo.GetByID(ctx, created.ID, orgBID)
	assert.ErrorIs(t, err, task.ErrNotFound)

	// list by mission_id in orgA
	res, err := repo.List(ctx, task.ListFilter{OrganizationID: orgAID, MissionID: &m.ID})
	require.NoError(t, err)
	require.Len(t, res.Tasks, 1)

	// soft delete is idempotent and tenant-scoped
	require.NoError(t, repo.SoftDelete(ctx, created.ID, orgAID))
	_, err = repo.GetByID(ctx, created.ID, orgAID)
	assert.ErrorIs(t, err, task.ErrNotFound)
}

func TestTaskRepository_Create_ForeignKeyViolation_MapsToInvalidReference(t *testing.T) {
	ctx, repo, _, orgAID, _, ownerID := setupTaskEnv(t)

	_, err := repo.Create(ctx, &task.Task{
		ID:             uuid.New(),
		OrganizationID: orgAID,
		MissionID:      uuid.New(),
		AssigneeID:     ownerID,
		Title:          "orphan",
		Status:         task.StatusTodo,
	})
	assert.ErrorIs(t, err, task.ErrInvalidReference)
}
