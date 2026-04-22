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

func TestUserRepository_ListByOrganization_ReturnsOnlyUsersInOrganization(t *testing.T) {
	env := testutil.NewPostgresIntegrationEnv(t)
	ctx := context.Background()
	queries := sqlc.New(env.Pool)
	orgRepo := NewOrgRepository(queries)
	userRepo := NewUserRepository(queries)

	orgA, err := orgRepo.Create(ctx, &organization.Organization{Name: "Alpha", Domain: "alpha.example.com", Workspace: "alpha", Status: organization.StatusActive})
	require.NoError(t, err)
	orgB, err := orgRepo.Create(ctx, &organization.Organization{Name: "Beta", Domain: "beta.example.com", Workspace: "beta", Status: organization.StatusActive})
	require.NoError(t, err)

	_, err = userRepo.Create(ctx, &user.User{
		ID:           uuid.New(),
		FirstName:    "Alpha",
		LastName:     "User",
		Email:        "alpha-user@example.com",
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

	_, err = userRepo.Create(ctx, &user.User{
		ID:           uuid.New(),
		FirstName:    "Beta",
		LastName:     "User",
		Email:        "beta-user@example.com",
		PasswordHash: "hashed",
		Status:       user.StatusActive,
		Language:     "pt-br",
		Memberships: []membership.Membership{{
			OrganizationID: orgB.ID,
			Role:           membership.RoleSuperAdmin,
			Status:         membership.StatusActive,
		}},
	})
	require.NoError(t, err)

	result, err := userRepo.ListByOrganization(ctx, orgA.ID, nil, 1, 20)
	require.NoError(t, err)
	require.Len(t, result.Users, 1)
	assert.Equal(t, "Alpha", result.Users[0].FirstName)
	assert.Equal(t, int64(1), result.Total)
}
