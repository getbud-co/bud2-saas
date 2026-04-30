//go:build integration

package postgres

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/getbud-co/bud2/backend/internal/domain/organization"
	"github.com/getbud-co/bud2/backend/internal/domain/tag"
	"github.com/getbud-co/bud2/backend/internal/infra/postgres/sqlc"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func TestTagRepository_CRUD_IsTenantScopedAndSoftDeletes(t *testing.T) {
	env := testutil.NewPostgresIntegrationEnv(t)
	ctx := context.Background()
	queries := sqlc.New(env.Pool)
	orgRepo := NewOrgRepository(queries)
	tagRepo := NewTagRepository(queries)

	orgA, err := orgRepo.Create(ctx, &organization.Organization{Name: "Tags A", Domain: "tags-a.example.com", Workspace: "tags-a", Status: organization.StatusActive})
	require.NoError(t, err)
	orgB, err := orgRepo.Create(ctx, &organization.Organization{Name: "Tags B", Domain: "tags-b.example.com", Workspace: "tags-b", Status: organization.StatusActive})
	require.NoError(t, err)

	created, err := tagRepo.Create(ctx, &tag.Tag{
		ID:             uuid.New(),
		OrganizationID: orgA.ID,
		Name:           "Engineering",
		Color:          tag.ColorOrange,
	})
	require.NoError(t, err)
	assert.Equal(t, orgA.ID, created.OrganizationID)

	// tenant isolation: orgB cannot see orgA's tag
	_, err = tagRepo.GetByID(ctx, created.ID, orgB.ID)
	assert.ErrorIs(t, err, tag.ErrNotFound)

	listed, err := tagRepo.List(ctx, orgA.ID, 1, 20)
	require.NoError(t, err)
	require.Len(t, listed.Tags, 1)
	assert.Equal(t, int64(1), listed.Total)

	created.Name = "Engineering Updated"
	updated, err := tagRepo.Update(ctx, created)
	require.NoError(t, err)
	assert.Equal(t, "Engineering Updated", updated.Name)

	require.NoError(t, tagRepo.SoftDelete(ctx, created.ID, orgA.ID))
	_, err = tagRepo.GetByID(ctx, created.ID, orgA.ID)
	assert.ErrorIs(t, err, tag.ErrNotFound)

	// soft delete is idempotent
	assert.NoError(t, tagRepo.SoftDelete(ctx, created.ID, orgA.ID))
}

func TestTagRepository_Create_UniqueNamePerOrg(t *testing.T) {
	env := testutil.NewPostgresIntegrationEnv(t)
	ctx := context.Background()
	queries := sqlc.New(env.Pool)
	orgRepo := NewOrgRepository(queries)
	tagRepo := NewTagRepository(queries)

	org, err := orgRepo.Create(ctx, &organization.Organization{Name: "Tags Unique", Domain: "tags-unique.example.com", Workspace: "tags-unique", Status: organization.StatusActive})
	require.NoError(t, err)

	_, err = tagRepo.Create(ctx, &tag.Tag{ID: uuid.New(), OrganizationID: org.ID, Name: "Design", Color: tag.ColorNeutral})
	require.NoError(t, err)

	_, err = tagRepo.Create(ctx, &tag.Tag{ID: uuid.New(), OrganizationID: org.ID, Name: "design", Color: tag.ColorNeutral})
	assert.ErrorIs(t, err, tag.ErrNameExists)
}
