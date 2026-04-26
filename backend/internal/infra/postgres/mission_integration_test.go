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

func TestMissionRepository_IsDescendant(t *testing.T) {
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
	grand, err := repo.Create(ctx, &mission.Mission{
		ID: uuid.New(), OrganizationID: orgAID, OwnerID: ownerID, ParentID: &child.ID,
		Title: "grand", Status: mission.StatusActive, Visibility: mission.VisibilityPublic, KanbanStatus: mission.KanbanTodo,
	})
	require.NoError(t, err)
	other, err := repo.Create(ctx, &mission.Mission{
		ID: uuid.New(), OrganizationID: orgAID, OwnerID: ownerID,
		Title: "other", Status: mission.StatusActive, Visibility: mission.VisibilityPublic, KanbanStatus: mission.KanbanTodo,
	})
	require.NoError(t, err)

	is, err := repo.IsDescendant(ctx, orgAID, root.ID, grand.ID)
	require.NoError(t, err)
	assert.True(t, is)

	is, err = repo.IsDescendant(ctx, orgAID, child.ID, grand.ID)
	require.NoError(t, err)
	assert.True(t, is)

	is, err = repo.IsDescendant(ctx, orgAID, root.ID, other.ID)
	require.NoError(t, err)
	assert.False(t, is)

	// The CTE anchor is `WHERE id = ancestor`, so the ancestor itself is in
	// the subtree result. The use case (UpdateUseCase.validateParentChange)
	// short-circuits the self-parent case before calling IsDescendant, so this
	// behavior is never exercised in production paths but is asserted here to
	// document the SQL contract.
	is, err = repo.IsDescendant(ctx, orgAID, root.ID, root.ID)
	require.NoError(t, err)
	assert.True(t, is)
}

func TestMissionRepository_IsDescendant_CrossTenant_ReturnsFalse(t *testing.T) {
	ctx, repo, orgAID, orgBID, ownerID := setupMissionEnv(t)

	// orgA: a mission
	a, err := repo.Create(ctx, &mission.Mission{
		ID: uuid.New(), OrganizationID: orgAID, OwnerID: ownerID,
		Title: "a-orgA", Status: mission.StatusActive, Visibility: mission.VisibilityPublic, KanbanStatus: mission.KanbanTodo,
	})
	require.NoError(t, err)

	// Querying within orgB asking if A is a descendant of A: must return false because
	// A does not belong to orgB. Tenant filter must short-circuit the CTE anchor.
	is, err := repo.IsDescendant(ctx, orgBID, a.ID, a.ID)
	require.NoError(t, err)
	assert.False(t, is, "missions from another tenant must not appear in the subtree")
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
