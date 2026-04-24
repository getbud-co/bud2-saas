//go:build integration

package postgres

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/getbud-co/bud2/backend/internal/domain/organization"
	"github.com/getbud-co/bud2/backend/internal/domain/role"
	"github.com/getbud-co/bud2/backend/internal/domain/user"
	"github.com/getbud-co/bud2/backend/internal/infra/postgres/sqlc"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func TestRoleRepository_List_CountsUsersWithinRequestedOrganization(t *testing.T) {
	env := testutil.NewPostgresIntegrationEnv(t)
	ctx := context.Background()
	queries := sqlc.New(env.Pool)
	orgRepo := NewOrgRepository(queries)
	userRepo := NewUserRepository(queries)
	roleRepo := NewRoleRepository(queries)

	orgA, err := orgRepo.Create(ctx, &organization.Organization{Name: "Alpha", Domain: "alpha-roles.example.com", Workspace: "alpha-roles", Status: organization.StatusActive})
	require.NoError(t, err)
	orgB, err := orgRepo.Create(ctx, &organization.Organization{Name: "Beta", Domain: "beta-roles.example.com", Workspace: "beta-roles", Status: organization.StatusActive})
	require.NoError(t, err)

	_, err = userRepo.Create(ctx, testUserWithMemberships("alpha-admin@example.com", []organization.Membership{{
		OrganizationID: orgA.ID,
		Role:           organization.MembershipRoleSuperAdmin,
		Status:         organization.MembershipStatusActive,
	}}))
	require.NoError(t, err)
	_, err = userRepo.Create(ctx, testUserWithMemberships("beta-admin@example.com", []organization.Membership{{
		OrganizationID: orgB.ID,
		Role:           organization.MembershipRoleSuperAdmin,
		Status:         organization.MembershipStatusActive,
	}}))
	require.NoError(t, err)
	_, err = userRepo.Create(ctx, testUserWithMemberships("alpha-manager@example.com", []organization.Membership{{
		OrganizationID: orgA.ID,
		Role:           organization.MembershipRoleGestor,
		Status:         organization.MembershipStatusInactive,
	}}))
	require.NoError(t, err)

	roles, err := roleRepo.List(ctx, orgA.ID)

	require.NoError(t, err)
	counts := roleCountsBySlug(roles)
	assert.Equal(t, 1, counts["super-admin"])
	assert.Equal(t, 1, counts["gestor"])
	assert.Equal(t, 0, counts["colaborador"])
}

func TestRoleRepository_List_IgnoresDeletedMemberships(t *testing.T) {
	env := testutil.NewPostgresIntegrationEnv(t)
	ctx := context.Background()
	queries := sqlc.New(env.Pool)
	orgRepo := NewOrgRepository(queries)
	userRepo := NewUserRepository(queries)
	roleRepo := NewRoleRepository(queries)

	org, err := orgRepo.Create(ctx, &organization.Organization{Name: "Gamma", Domain: "gamma-roles.example.com", Workspace: "gamma-roles", Status: organization.StatusActive})
	require.NoError(t, err)
	member, err := userRepo.Create(ctx, testUserWithMemberships("deleted-membership@example.com", []organization.Membership{{
		OrganizationID: org.ID,
		Role:           organization.MembershipRoleVisualizador,
		Status:         organization.MembershipStatusActive,
	}}))
	require.NoError(t, err)
	require.NoError(t, userRepo.DeleteMembership(ctx, org.ID, member.ID))

	roles, err := roleRepo.List(ctx, org.ID)

	require.NoError(t, err)
	assert.Equal(t, 0, roleCountsBySlug(roles)["visualizador"])
}

func testUserWithMemberships(email string, memberships []organization.Membership) *user.User {
	return &user.User{
		ID:           uuid.New(),
		FirstName:    "Test",
		LastName:     "User",
		Email:        email,
		PasswordHash: "hashed",
		Status:       user.StatusActive,
		Language:     "pt-br",
		Memberships:  memberships,
	}
}

func roleCountsBySlug(roles []role.Role) map[string]int {
	counts := make(map[string]int, len(roles))
	for _, r := range roles {
		counts[r.Slug] = r.UsersCount
	}
	return counts
}
