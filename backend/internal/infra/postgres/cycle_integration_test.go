//go:build integration

package postgres

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/getbud-co/bud2/backend/internal/domain/cycle"
	"github.com/getbud-co/bud2/backend/internal/domain/organization"
	"github.com/getbud-co/bud2/backend/internal/infra/postgres/sqlc"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func TestCycleRepository_CRUD_IsTenantScopedAndSoftDeletes(t *testing.T) {
	env := testutil.NewPostgresIntegrationEnv(t)
	ctx := context.Background()
	queries := sqlc.New(env.Pool)
	orgRepo := NewOrgRepository(queries)
	cycleRepo := NewCycleRepository(queries)

	orgA, err := orgRepo.Create(ctx, &organization.Organization{Name: "Cycles A", Domain: "cycles-a.example.com", Workspace: "cycles-a", Status: organization.StatusActive})
	require.NoError(t, err)
	orgB, err := orgRepo.Create(ctx, &organization.Organization{Name: "Cycles B", Domain: "cycles-b.example.com", Workspace: "cycles-b", Status: organization.StatusActive})
	require.NoError(t, err)

	start := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC)
	created, err := cycleRepo.Create(ctx, &cycle.Cycle{
		ID:             uuid.New(),
		OrganizationID: orgA.ID,
		Name:           "Q1 2026",
		Type:           cycle.TypeQuarterly,
		StartDate:      start,
		EndDate:        end,
		Status:         cycle.StatusPlanning,
	})
	require.NoError(t, err)
	assert.Equal(t, orgA.ID, created.OrganizationID)

	_, err = cycleRepo.GetByID(ctx, created.ID, orgB.ID)
	assert.ErrorIs(t, err, cycle.ErrNotFound)

	listed, err := cycleRepo.List(ctx, orgA.ID, nil, 1, 20)
	require.NoError(t, err)
	require.Len(t, listed.Cycles, 1)
	assert.Equal(t, int64(1), listed.Total)

	created.Status = cycle.StatusActive
	updated, err := cycleRepo.Update(ctx, created)
	require.NoError(t, err)
	assert.Equal(t, cycle.StatusActive, updated.Status)

	require.NoError(t, cycleRepo.SoftDelete(ctx, created.ID, orgA.ID))
	_, err = cycleRepo.GetByID(ctx, created.ID, orgA.ID)
	assert.ErrorIs(t, err, cycle.ErrNotFound)
}
