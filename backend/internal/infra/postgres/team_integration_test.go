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
	"github.com/getbud-co/bud2/backend/internal/domain/team"
	"github.com/getbud-co/bud2/backend/internal/domain/user"
	"github.com/getbud-co/bud2/backend/internal/infra/postgres/sqlc"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func TestTeamRepository_GetByID_ExcludesMembersWithoutActiveOrganizationMembership(t *testing.T) {
	env := testutil.NewPostgresIntegrationEnv(t)
	ctx := context.Background()
	queries := sqlc.New(env.Pool)
	orgRepo := NewOrgRepository(queries)
	userRepo := NewUserRepository(queries)
	teamRepo := NewTeamRepository(queries)

	org, err := orgRepo.Create(ctx, &organization.Organization{Name: "Alpha", Domain: "alpha.example.com", Workspace: "alpha", Status: organization.StatusActive})
	require.NoError(t, err)

	member, err := userRepo.Create(ctx, &user.User{
		ID:           uuid.New(),
		FirstName:    "Alice",
		LastName:     "Member",
		Email:        "alice-member@example.com",
		PasswordHash: "hashed",
		Status:       user.StatusActive,
		Language:     "pt-br",
		Memberships: []membership.Membership{{
			OrganizationID: org.ID,
			Role:           membership.RoleSuperAdmin,
			Status:         membership.StatusActive,
		}},
	})
	require.NoError(t, err)

	created, err := teamRepo.Create(ctx, &team.Team{
		ID:             uuid.New(),
		OrganizationID: org.ID,
		Name:           "Platform",
		Color:          team.ColorNeutral,
		Status:         team.StatusActive,
		Members: []team.TeamMember{{
			UserID:     member.ID,
			RoleInTeam: team.RoleLeader,
		}},
	})
	require.NoError(t, err)
	require.Len(t, created.Members, 1)

	require.NoError(t, userRepo.DeleteMembership(ctx, org.ID, member.ID))

	reloaded, err := teamRepo.GetByID(ctx, created.ID, org.ID)
	require.NoError(t, err)
	assert.Empty(t, reloaded.Members)
}

func TestTeamRepository_SoftDeleteMemberByUser_OnlyTouchesTeamsInRequestedOrganization(t *testing.T) {
	env := testutil.NewPostgresIntegrationEnv(t)
	ctx := context.Background()
	queries := sqlc.New(env.Pool)
	orgRepo := NewOrgRepository(queries)
	userRepo := NewUserRepository(queries)
	teamRepo := NewTeamRepository(queries)

	orgA, err := orgRepo.Create(ctx, &organization.Organization{Name: "Alpha", Domain: "alpha.example.com", Workspace: "alpha", Status: organization.StatusActive})
	require.NoError(t, err)
	orgB, err := orgRepo.Create(ctx, &organization.Organization{Name: "Beta", Domain: "beta.example.com", Workspace: "beta", Status: organization.StatusActive})
	require.NoError(t, err)

	member, err := userRepo.Create(ctx, &user.User{
		ID:           uuid.New(),
		FirstName:    "Taylor",
		LastName:     "Member",
		Email:        "taylor-member@example.com",
		PasswordHash: "hashed",
		Status:       user.StatusActive,
		Language:     "pt-br",
		Memberships: []membership.Membership{
			{
				OrganizationID: orgA.ID,
				Role:           membership.RoleSuperAdmin,
				Status:         membership.StatusActive,
			},
			{
				OrganizationID: orgB.ID,
				Role:           membership.RoleSuperAdmin,
				Status:         membership.StatusActive,
			},
		},
	})
	require.NoError(t, err)

	teamA, err := teamRepo.Create(ctx, &team.Team{
		ID:             uuid.New(),
		OrganizationID: orgA.ID,
		Name:           "Alpha Team",
		Color:          team.ColorNeutral,
		Status:         team.StatusActive,
		Members: []team.TeamMember{{
			UserID:     member.ID,
			RoleInTeam: team.RoleLeader,
		}},
	})
	require.NoError(t, err)

	teamB, err := teamRepo.Create(ctx, &team.Team{
		ID:             uuid.New(),
		OrganizationID: orgB.ID,
		Name:           "Beta Team",
		Color:          team.ColorNeutral,
		Status:         team.StatusActive,
		Members: []team.TeamMember{{
			UserID:     member.ID,
			RoleInTeam: team.RoleLeader,
		}},
	})
	require.NoError(t, err)

	require.NoError(t, teamRepo.SoftDeleteMemberByUser(ctx, orgA.ID, member.ID))

	reloadedA, err := teamRepo.GetByID(ctx, teamA.ID, orgA.ID)
	require.NoError(t, err)
	assert.Empty(t, reloadedA.Members)

	reloadedB, err := teamRepo.GetByID(ctx, teamB.ID, orgB.ID)
	require.NoError(t, err)
	require.Len(t, reloadedB.Members, 1)
	assert.Equal(t, member.ID, reloadedB.Members[0].UserID)
}
