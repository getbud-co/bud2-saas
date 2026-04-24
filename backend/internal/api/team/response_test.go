package team

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	domainteam "github.com/getbud-co/bud2/backend/internal/domain/team"
)

func TestToResponse_MapsFieldsAndMembers(t *testing.T) {
	createdAt := time.Date(2024, 1, 2, 3, 4, 5, 0, time.UTC)
	updatedAt := time.Date(2024, 1, 3, 4, 5, 6, 0, time.UTC)
	joinedAt := time.Date(2024, 1, 4, 5, 6, 7, 0, time.UTC)
	description := "Core team"
	firstName := "Ada"
	lastName := "Lovelace"
	jobTitle := "Engineer"
	tm := &domainteam.Team{
		ID:             uuid.New(),
		OrganizationID: uuid.New(),
		Name:           "Core",
		Description:    &description,
		Color:          domainteam.ColorSuccess,
		Status:         domainteam.StatusActive,
		CreatedAt:      createdAt,
		UpdatedAt:      updatedAt,
		Members: []domainteam.TeamMember{
			{
				ID:            uuid.New(),
				TeamID:        uuid.New(),
				UserID:        uuid.New(),
				RoleInTeam:    domainteam.RoleLeader,
				JoinedAt:      joinedAt,
				UserFirstName: &firstName,
				UserLastName:  &lastName,
				UserJobTitle:  &jobTitle,
			},
		},
	}

	resp := toResponse(tm)

	assert.Equal(t, tm.ID.String(), resp.ID)
	assert.Equal(t, tm.OrganizationID.String(), resp.OrgID)
	assert.Equal(t, "Core", resp.Name)
	assert.Equal(t, &description, resp.Description)
	assert.Equal(t, "success", resp.Color)
	assert.Equal(t, "active", resp.Status)
	assert.Equal(t, 1, resp.MemberCount)
	assert.Equal(t, createdAt.Format(time.RFC3339), resp.CreatedAt)
	assert.Equal(t, updatedAt.Format(time.RFC3339), resp.UpdatedAt)
	require.Len(t, resp.Members, 1)
	assert.Equal(t, tm.Members[0].TeamID.String(), resp.Members[0].TeamID)
	assert.Equal(t, tm.Members[0].UserID.String(), resp.Members[0].UserID)
	assert.Equal(t, "leader", resp.Members[0].RoleInTeam)
	assert.Equal(t, joinedAt.Format(time.RFC3339), resp.Members[0].JoinedAt)
	require.NotNil(t, resp.Members[0].User)
	assert.Equal(t, "Ada", resp.Members[0].User.FirstName)
	assert.Equal(t, "Lovelace", resp.Members[0].User.LastName)
	assert.Equal(t, "AL", *resp.Members[0].User.Initials)
	assert.Equal(t, &jobTitle, resp.Members[0].User.JobTitle)
}

func TestToResponse_NilDescriptionAndMemberWithoutName(t *testing.T) {
	tm := &domainteam.Team{
		ID:             uuid.New(),
		OrganizationID: uuid.New(),
		Name:           "Core",
		Color:          domainteam.ColorNeutral,
		Status:         domainteam.StatusActive,
		Members: []domainteam.TeamMember{
			{TeamID: uuid.New(), UserID: uuid.New(), RoleInTeam: domainteam.RoleMember},
		},
	}

	resp := toResponse(tm)

	assert.Nil(t, resp.Description)
	require.Len(t, resp.Members, 1)
	assert.Nil(t, resp.Members[0].User)
}

func TestInitials_HandlesEmptyAndMultibyteNames(t *testing.T) {
	assert.Equal(t, "", initials("", ""))
	assert.Equal(t, "A", initials("ada", ""))
	assert.Equal(t, "ÉØ", initials("éclair", "øster"))
}
