//go:build integration

package postgres

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/getbud-co/bud2/backend/internal/domain/indicator"
	"github.com/getbud-co/bud2/backend/internal/domain/mission"
	"github.com/getbud-co/bud2/backend/internal/domain/organization"
	"github.com/getbud-co/bud2/backend/internal/domain/task"
	"github.com/getbud-co/bud2/backend/internal/domain/user"
	"github.com/getbud-co/bud2/backend/internal/infra/postgres/sqlc"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func setupMissionEnv(t *testing.T) (context.Context, *MissionRepository, uuid.UUID, uuid.UUID, uuid.UUID) {
	t.Helper()
	env := testutil.NewPostgresIntegrationEnv(t)
	ctx := context.Background()
	queries := sqlc.New(env.Pool)
	orgRepo := NewOrgRepository(queries)
	userRepo := NewUserRepository(queries)
	missionRepo := NewMissionRepository(queries, env.Pool)

	orgA, err := orgRepo.Create(ctx, &organization.Organization{Name: "Missions A", Domain: "miss-a.example.com", Workspace: "miss-a", Status: organization.StatusActive})
	require.NoError(t, err)
	orgB, err := orgRepo.Create(ctx, &organization.Organization{Name: "Missions B", Domain: "miss-b.example.com", Workspace: "miss-b", Status: organization.StatusActive})
	require.NoError(t, err)

	owner, err := userRepo.Create(ctx, &user.User{
		ID:           uuid.New(),
		FirstName:    "Owner",
		LastName:     "Test",
		Email:        "owner-mission@example.com",
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
	return ctx, missionRepo, orgA.ID, orgB.ID, owner.ID
}

func TestMissionRepository_CRUD_TenantScopedAndSoftDeletes(t *testing.T) {
	ctx, repo, orgAID, orgBID, ownerID := setupMissionEnv(t)

	created, err := repo.Create(ctx, &mission.Mission{
		ID:             uuid.New(),
		OrganizationID: orgAID,
		OwnerID:        ownerID,
		Title:          "Reduzir churn",
		Status:         mission.StatusActive,
		Visibility:     mission.VisibilityPublic,
		KanbanStatus:   mission.KanbanTodo,
	})
	require.NoError(t, err)
	assert.Equal(t, orgAID, created.OrganizationID)

	// cross-tenant get must miss
	_, err = repo.GetByID(ctx, created.ID, orgBID)
	assert.ErrorIs(t, err, mission.ErrNotFound)

	// list root in orgA
	rootRes, err := repo.List(ctx, mission.ListFilter{OrganizationID: orgAID, FilterByParent: true, ParentID: nil})
	require.NoError(t, err)
	require.Len(t, rootRes.Missions, 1)
	assert.Equal(t, int64(1), rootRes.Total)

	// soft delete
	require.NoError(t, repo.SoftDeleteSubtree(ctx, created.ID, orgAID))
	_, err = repo.GetByID(ctx, created.ID, orgAID)
	assert.ErrorIs(t, err, mission.ErrNotFound)
}

func TestMissionRepository_SoftDeleteSubtree_CascadesDescendants(t *testing.T) {
	ctx, repo, orgAID, _, ownerID := setupMissionEnv(t)

	root, err := repo.Create(ctx, &mission.Mission{
		ID: uuid.New(), OrganizationID: orgAID, OwnerID: ownerID,
		Title: "root", Status: mission.StatusActive, Visibility: mission.VisibilityPublic, KanbanStatus: mission.KanbanTodo,
	})
	require.NoError(t, err)
	child, err := repo.Create(ctx, &mission.Mission{
		ID: uuid.New(), OrganizationID: orgAID, OwnerID: ownerID, ParentID: &root.ID,
		Title: "child", Status: mission.StatusActive, Visibility: mission.VisibilityPublic, KanbanStatus: mission.KanbanTodo,
	})
	require.NoError(t, err)
	grandchild, err := repo.Create(ctx, &mission.Mission{
		ID: uuid.New(), OrganizationID: orgAID, OwnerID: ownerID, ParentID: &child.ID,
		Title: "grand", Status: mission.StatusActive, Visibility: mission.VisibilityPublic, KanbanStatus: mission.KanbanTodo,
	})
	require.NoError(t, err)

	require.NoError(t, repo.SoftDeleteSubtree(ctx, root.ID, orgAID))

	for _, id := range []uuid.UUID{root.ID, child.ID, grandchild.ID} {
		_, err := repo.GetByID(ctx, id, orgAID)
		assert.ErrorIsf(t, err, mission.ErrNotFound, "id=%s should be soft-deleted", id)
	}
}

func TestMissionRepository_SoftDeleteSubtree_CrossTenant_IsNoOp(t *testing.T) {
	ctx, repo, orgAID, orgBID, ownerID := setupMissionEnv(t)

	root, err := repo.Create(ctx, &mission.Mission{
		ID: uuid.New(), OrganizationID: orgAID, OwnerID: ownerID,
		Title: "root", Status: mission.StatusActive, Visibility: mission.VisibilityPublic, KanbanStatus: mission.KanbanTodo,
	})
	require.NoError(t, err)

	// Calling SoftDeleteSubtree from orgB context must NOT touch orgA's mission.
	require.NoError(t, repo.SoftDeleteSubtree(ctx, root.ID, orgBID))

	got, err := repo.GetByID(ctx, root.ID, orgAID)
	require.NoError(t, err, "mission should still be retrievable in its original tenant")
	assert.Equal(t, root.ID, got.ID)
}

func TestMissionRepository_Update_ChangesParent(t *testing.T) {
	ctx, repo, orgAID, _, ownerID := setupMissionEnv(t)

	a, err := repo.Create(ctx, &mission.Mission{
		ID: uuid.New(), OrganizationID: orgAID, OwnerID: ownerID,
		Title: "a", Status: mission.StatusActive, Visibility: mission.VisibilityPublic, KanbanStatus: mission.KanbanTodo,
	})
	require.NoError(t, err)
	b, err := repo.Create(ctx, &mission.Mission{
		ID: uuid.New(), OrganizationID: orgAID, OwnerID: ownerID,
		Title: "b", Status: mission.StatusActive, Visibility: mission.VisibilityPublic, KanbanStatus: mission.KanbanTodo,
	})
	require.NoError(t, err)

	b.ParentID = &a.ID
	updated, err := repo.Update(ctx, b)
	require.NoError(t, err)
	require.NotNil(t, updated.ParentID)
	assert.Equal(t, a.ID, *updated.ParentID)

	b.ParentID = nil
	updated, err = repo.Update(ctx, b)
	require.NoError(t, err)
	assert.Nil(t, updated.ParentID)
}

// Soft-deleting a mission must cascade to its indicators and tasks (and to
// every descendant mission's indicators and tasks). The cascade is encoded as
// a single CTE in soft_delete_mission_subtree.sql; this test guards the
// contract end-to-end against a real Postgres.
func TestMissionRepository_SoftDeleteSubtree_CascadesToIndicatorsAndTasks(t *testing.T) {
	env := testutil.NewPostgresIntegrationEnv(t)
	ctx := context.Background()
	queries := sqlc.New(env.Pool)
	orgRepo := NewOrgRepository(queries)
	userRepo := NewUserRepository(queries)
	missionRepo := NewMissionRepository(queries, env.Pool)
	indRepo := NewIndicatorRepository(queries)
	taskRepo := NewTaskRepository(queries)

	orgA, err := orgRepo.Create(ctx, &organization.Organization{Name: "Cascade A", Domain: "cascade-a.example.com", Workspace: "cascade-a", Status: organization.StatusActive})
	require.NoError(t, err)
	orgB, err := orgRepo.Create(ctx, &organization.Organization{Name: "Cascade B", Domain: "cascade-b.example.com", Workspace: "cascade-b", Status: organization.StatusActive})
	require.NoError(t, err)

	owner, err := userRepo.Create(ctx, &user.User{
		ID:           uuid.New(),
		FirstName:    "Owner",
		LastName:     "Test",
		Email:        "owner-cascade@example.com",
		PasswordHash: "hashed",
		Status:       user.StatusActive,
		Language:     "pt-br",
		Memberships: []organization.Membership{
			{OrganizationID: orgA.ID, Role: organization.MembershipRoleSuperAdmin, Status: organization.MembershipStatusActive},
			{OrganizationID: orgB.ID, Role: organization.MembershipRoleSuperAdmin, Status: organization.MembershipStatusActive},
		},
	})
	require.NoError(t, err)

	// Tree in orgA: root -> child. Both carry indicators and tasks.
	root, err := missionRepo.Create(ctx, &mission.Mission{
		ID: uuid.New(), OrganizationID: orgA.ID, OwnerID: owner.ID,
		Title: "root", Status: mission.StatusActive, Visibility: mission.VisibilityPublic, KanbanStatus: mission.KanbanTodo,
	})
	require.NoError(t, err)
	child, err := missionRepo.Create(ctx, &mission.Mission{
		ID: uuid.New(), OrganizationID: orgA.ID, OwnerID: owner.ID, ParentID: &root.ID,
		Title: "child", Status: mission.StatusActive, Visibility: mission.VisibilityPublic, KanbanStatus: mission.KanbanTodo,
	})
	require.NoError(t, err)

	rootInd, err := indRepo.Create(ctx, &indicator.Indicator{
		ID: uuid.New(), OrganizationID: orgA.ID, MissionID: root.ID, OwnerID: owner.ID,
		Title: "root indicator", Status: indicator.StatusActive,
	})
	require.NoError(t, err)
	childInd, err := indRepo.Create(ctx, &indicator.Indicator{
		ID: uuid.New(), OrganizationID: orgA.ID, MissionID: child.ID, OwnerID: owner.ID,
		Title: "child indicator", Status: indicator.StatusActive,
	})
	require.NoError(t, err)

	rootTask, err := taskRepo.Create(ctx, &task.Task{
		ID: uuid.New(), OrganizationID: orgA.ID, MissionID: root.ID, AssigneeID: owner.ID,
		Title: "root task", Status: task.StatusTodo,
	})
	require.NoError(t, err)
	childTask, err := taskRepo.Create(ctx, &task.Task{
		ID: uuid.New(), OrganizationID: orgA.ID, MissionID: child.ID, AssigneeID: owner.ID,
		Title: "child task", Status: task.StatusTodo,
	})
	require.NoError(t, err)

	// Isolation guard: an unrelated mission in orgB with its own indicator and
	// task. The cascade for orgA's root must not touch any of these.
	otherMission, err := missionRepo.Create(ctx, &mission.Mission{
		ID: uuid.New(), OrganizationID: orgB.ID, OwnerID: owner.ID,
		Title: "other-org mission", Status: mission.StatusActive, Visibility: mission.VisibilityPublic, KanbanStatus: mission.KanbanTodo,
	})
	require.NoError(t, err)
	otherInd, err := indRepo.Create(ctx, &indicator.Indicator{
		ID: uuid.New(), OrganizationID: orgB.ID, MissionID: otherMission.ID, OwnerID: owner.ID,
		Title: "other-org indicator", Status: indicator.StatusActive,
	})
	require.NoError(t, err)
	otherTask, err := taskRepo.Create(ctx, &task.Task{
		ID: uuid.New(), OrganizationID: orgB.ID, MissionID: otherMission.ID, AssigneeID: owner.ID,
		Title: "other-org task", Status: task.StatusTodo,
	})
	require.NoError(t, err)

	require.NoError(t, missionRepo.SoftDeleteSubtree(ctx, root.ID, orgA.ID))

	// Both missions in orgA's subtree are gone.
	for _, id := range []uuid.UUID{root.ID, child.ID} {
		_, err := missionRepo.GetByID(ctx, id, orgA.ID)
		assert.ErrorIsf(t, err, mission.ErrNotFound, "mission %s should be soft-deleted", id)
	}

	// Both indicators below the subtree are gone.
	for _, id := range []uuid.UUID{rootInd.ID, childInd.ID} {
		_, err := indRepo.GetByID(ctx, id, orgA.ID)
		assert.ErrorIsf(t, err, indicator.ErrNotFound, "indicator %s should be soft-deleted", id)
	}

	// Both tasks below the subtree are gone.
	for _, id := range []uuid.UUID{rootTask.ID, childTask.ID} {
		_, err := taskRepo.GetByID(ctx, id, orgA.ID)
		assert.ErrorIsf(t, err, task.ErrNotFound, "task %s should be soft-deleted", id)
	}

	// orgB's mission/indicator/task untouched.
	_, err = missionRepo.GetByID(ctx, otherMission.ID, orgB.ID)
	require.NoError(t, err, "cross-org mission must not be touched")
	_, err = indRepo.GetByID(ctx, otherInd.ID, orgB.ID)
	require.NoError(t, err, "cross-org indicator must not be touched")
	_, err = taskRepo.GetByID(ctx, otherTask.ID, orgB.ID)
	require.NoError(t, err, "cross-org task must not be touched")
}
