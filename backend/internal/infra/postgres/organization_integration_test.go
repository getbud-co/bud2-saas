//go:build integration

package postgres

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/getbud-co/bud2/backend/internal/domain/membership"
	"github.com/getbud-co/bud2/backend/internal/domain/organization"
	"github.com/getbud-co/bud2/backend/internal/domain/user"
	"github.com/getbud-co/bud2/backend/internal/infra/postgres/sqlc"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func TestOrgRepository_ListByUser_ReturnsOnlyAccessibleOrganizations(t *testing.T) {
	env := testutil.NewPostgresIntegrationEnv(t)
	ctx := context.Background()
	queries := sqlc.New(env.Pool)
	orgRepo := NewOrgRepository(queries)
	userRepo := NewUserRepository(queries)

	orgA, err := orgRepo.Create(ctx, &organization.Organization{Name: "Alpha", Domain: "alpha.example.com", Workspace: "alpha", Status: organization.StatusActive})
	require.NoError(t, err)
	orgB, err := orgRepo.Create(ctx, &organization.Organization{Name: "Beta", Domain: "beta.example.com", Workspace: "beta", Status: organization.StatusActive})
	require.NoError(t, err)

	createdUser, err := userRepo.Create(ctx, &user.User{
		ID:           uuid.New(),
		FirstName:    "Member",
		LastName:     "User",
		Email:        "member@example.com",
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

	result, err := orgRepo.ListByUser(ctx, createdUser.ID, organization.ListFilter{Page: 1, Size: 20})
	require.NoError(t, err)
	assert.Len(t, result.Organizations, 1)
	assert.Equal(t, orgA.ID, result.Organizations[0].ID)
	assert.NotEqual(t, orgB.ID, result.Organizations[0].ID)
	assert.Equal(t, int64(1), result.Total)
}

func TestOrgRepository_GetByIDForUser_HidesInaccessibleOrganization(t *testing.T) {
	env := testutil.NewPostgresIntegrationEnv(t)
	ctx := context.Background()
	queries := sqlc.New(env.Pool)
	orgRepo := NewOrgRepository(queries)
	userRepo := NewUserRepository(queries)

	orgA, err := orgRepo.Create(ctx, &organization.Organization{Name: "Alpha", Domain: "alpha.example.com", Workspace: "alpha", Status: organization.StatusActive})
	require.NoError(t, err)
	orgB, err := orgRepo.Create(ctx, &organization.Organization{Name: "Beta", Domain: "beta.example.com", Workspace: "beta", Status: organization.StatusActive})
	require.NoError(t, err)

	createdUser, err := userRepo.Create(ctx, &user.User{
		ID:           uuid.New(),
		FirstName:    "Member",
		LastName:     "User",
		Email:        "member@example.com",
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

	accessible, err := orgRepo.GetByIDForUser(ctx, createdUser.ID, orgA.ID)
	require.NoError(t, err)
	assert.Equal(t, orgA.ID, accessible.ID)

	hidden, err := orgRepo.GetByIDForUser(ctx, createdUser.ID, orgB.ID)
	assert.ErrorIs(t, err, organization.ErrNotFound)
	assert.Nil(t, hidden)
}
