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
	"github.com/getbud-co/bud2/backend/internal/domain/user"
	"github.com/getbud-co/bud2/backend/internal/infra/postgres/sqlc"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func setupIndicatorEnv(t *testing.T) (context.Context, *IndicatorRepository, *MissionRepository, uuid.UUID, uuid.UUID, uuid.UUID) {
	t.Helper()
	env := testutil.NewPostgresIntegrationEnv(t)
	ctx := context.Background()
	queries := sqlc.New(env.Pool)
	orgRepo := NewOrgRepository(queries)
	userRepo := NewUserRepository(queries)
	missionRepo := NewMissionRepository(queries, env.Pool)
	indRepo := NewIndicatorRepository(queries)

	orgA, err := orgRepo.Create(ctx, &organization.Organization{Name: "Indicators A", Domain: "ind-a.example.com", Workspace: "ind-a", Status: organization.StatusActive})
	require.NoError(t, err)
	orgB, err := orgRepo.Create(ctx, &organization.Organization{Name: "Indicators B", Domain: "ind-b.example.com", Workspace: "ind-b", Status: organization.StatusActive})
	require.NoError(t, err)

	owner, err := userRepo.Create(ctx, &user.User{
		ID:           uuid.New(),
		FirstName:    "Owner",
		LastName:     "Test",
		Email:        "owner-indicator@example.com",
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
	return ctx, indRepo, missionRepo, orgA.ID, orgB.ID, owner.ID
}

func TestIndicatorRepository_CRUD_TenantScopedAndSoftDeletes(t *testing.T) {
	ctx, repo, missionRepo, orgAID, orgBID, ownerID := setupIndicatorEnv(t)

	// Create the parent mission first.
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

	target := 100.0
	created, err := repo.Create(ctx, &indicator.Indicator{
		ID:             uuid.New(),
		OrganizationID: orgAID,
		MissionID:      m.ID,
		OwnerID:        ownerID,
		Title:          "Churn rate",
		TargetValue:    &target,
		Status:         indicator.StatusActive,
	})
	require.NoError(t, err)
	assert.Equal(t, orgAID, created.OrganizationID)
	require.NotNil(t, created.TargetValue)
	assert.InDelta(t, 100.0, *created.TargetValue, 0.0001)

	// cross-tenant get must miss
	_, err = repo.GetByID(ctx, created.ID, orgBID)
	assert.ErrorIs(t, err, indicator.ErrNotFound)

	// list by mission_id in orgA
	res, err := repo.List(ctx, indicator.ListFilter{OrganizationID: orgAID, MissionID: &m.ID})
	require.NoError(t, err)
	require.Len(t, res.Indicators, 1)
	assert.Equal(t, int64(1), res.Total)

	// update partial fields
	current := 42.5
	created.CurrentValue = &current
	created.Status = indicator.StatusAtRisk
	updated, err := repo.Update(ctx, created)
	require.NoError(t, err)
	assert.Equal(t, indicator.StatusAtRisk, updated.Status)
	require.NotNil(t, updated.CurrentValue)
	assert.InDelta(t, 42.5, *updated.CurrentValue, 0.0001)

	// soft delete is idempotent and tenant-scoped
	require.NoError(t, repo.SoftDelete(ctx, created.ID, orgAID))
	_, err = repo.GetByID(ctx, created.ID, orgAID)
	assert.ErrorIs(t, err, indicator.ErrNotFound)
}

func TestIndicatorRepository_Create_ForeignKeyViolation_MapsToInvalidReference(t *testing.T) {
	ctx, repo, _, orgAID, _, ownerID := setupIndicatorEnv(t)

	// mission_id points at a UUID that does not exist
	_, err := repo.Create(ctx, &indicator.Indicator{
		ID:             uuid.New(),
		OrganizationID: orgAID,
		MissionID:      uuid.New(),
		OwnerID:        ownerID,
		Title:          "orphan",
		Status:         indicator.StatusActive,
	})
	assert.ErrorIs(t, err, indicator.ErrInvalidReference)
}
