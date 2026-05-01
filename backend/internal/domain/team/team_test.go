package team

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"

	"github.com/getbud-co/bud2/backend/internal/domain"
)

func TestStatusIsValid(t *testing.T) {
	assert.True(t, StatusActive.IsValid())
	assert.True(t, StatusArchived.IsValid())
	assert.False(t, Status("deleted").IsValid())
}

func TestColorIsValid(t *testing.T) {
	valid := []Color{ColorNeutral, ColorOrange, ColorWine, ColorCaramel, ColorSuccess, ColorWarning, ColorError}
	for _, color := range valid {
		assert.True(t, color.IsValid())
	}
	assert.False(t, Color("blue").IsValid())
}

func TestRoleInTeamIsValid(t *testing.T) {
	assert.True(t, RoleLeader.IsValid())
	assert.True(t, RoleMember.IsValid())
	assert.True(t, RoleObserver.IsValid())
	assert.False(t, RoleInTeam("owner").IsValid())
}

func TestTeamMemberValidate(t *testing.T) {
	tests := []struct {
		name   string
		member TeamMember
	}{
		{name: "missing user id", member: TeamMember{RoleInTeam: RoleLeader}},
		{name: "invalid role", member: TeamMember{UserID: uuid.New(), RoleInTeam: RoleInTeam("owner")}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.ErrorIs(t, tt.member.Validate(), domain.ErrValidation)
		})
	}
}

func TestTeamValidate_RejectsInvalidFields(t *testing.T) {
	validMember := TeamMember{UserID: uuid.New(), RoleInTeam: RoleLeader}
	tests := []struct {
		name string
		team Team
	}{
		{name: "empty name", team: Team{Color: ColorNeutral, Status: StatusActive, Members: []TeamMember{validMember}}},
		{name: "invalid color", team: Team{Name: "Team", Color: Color("blue"), Status: StatusActive, Members: []TeamMember{validMember}}},
		{name: "invalid status", team: Team{Name: "Team", Color: ColorNeutral, Status: Status("deleted"), Members: []TeamMember{validMember}}},
		{name: "invalid member", team: Team{Name: "Team", Color: ColorNeutral, Status: StatusActive, Members: []TeamMember{{UserID: uuid.Nil, RoleInTeam: RoleLeader}}}},
		{name: "members without leader", team: Team{Name: "Team", Color: ColorNeutral, Status: StatusActive, Members: []TeamMember{{UserID: uuid.New(), RoleInTeam: RoleMember}}}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.ErrorIs(t, tt.team.Validate(), domain.ErrValidation)
		})
	}
}

func TestTeamValidate_AcceptsNoMembersAndLeader(t *testing.T) {
	noMembers := Team{Name: "Team", Color: ColorNeutral, Status: StatusActive}
	withLeader := Team{Name: "Team", Color: ColorNeutral, Status: StatusActive, Members: []TeamMember{{UserID: uuid.New(), RoleInTeam: RoleLeader}}}

	assert.NoError(t, noMembers.Validate())
	assert.NoError(t, withLeader.Validate())
}

func TestNewTeam_GeneratesIDAndDefaultsStatusActive(t *testing.T) {
	orgID := uuid.New()
	team, err := NewTeam(orgID, "Engineering", ColorOrange, nil)
	assert.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, team.ID)
	assert.Equal(t, orgID, team.OrganizationID)
	assert.Equal(t, "Engineering", team.Name)
	assert.Equal(t, ColorOrange, team.Color)
	assert.Equal(t, StatusActive, team.Status)
}

func TestNewTeam_IDIsAlwaysGenerated(t *testing.T) {
	t1, _ := NewTeam(uuid.New(), "A", ColorNeutral, nil)
	t2, _ := NewTeam(uuid.New(), "B", ColorNeutral, nil)
	assert.NotEqual(t, uuid.Nil, t1.ID)
	assert.NotEqual(t, t1.ID, t2.ID)
}

func TestNewTeam_WithDescription_AppliesOption(t *testing.T) {
	desc := "Backend squad"
	team, err := NewTeam(uuid.New(), "Engineering", ColorNeutral, nil, WithDescription(&desc))
	assert.NoError(t, err)
	assert.NotNil(t, team.Description)
	assert.Equal(t, "Backend squad", *team.Description)
}

func TestNewTeam_EmptyName_ReturnsValidationError(t *testing.T) {
	_, err := NewTeam(uuid.New(), "", ColorNeutral, nil)
	assert.ErrorIs(t, err, domain.ErrValidation)
}

func TestNewTeam_InvalidColor_ReturnsValidationError(t *testing.T) {
	_, err := NewTeam(uuid.New(), "Team", Color("blue"), nil)
	assert.ErrorIs(t, err, domain.ErrValidation)
}

func TestNewTeam_MembersWithoutLeader_ReturnsValidationError(t *testing.T) {
	members := []TeamMember{{UserID: uuid.New(), RoleInTeam: RoleMember}}
	_, err := NewTeam(uuid.New(), "Team", ColorNeutral, members)
	assert.ErrorIs(t, err, domain.ErrValidation)
}

func TestNewTeam_WithLeader_Succeeds(t *testing.T) {
	members := []TeamMember{{UserID: uuid.New(), RoleInTeam: RoleLeader}}
	team, err := NewTeam(uuid.New(), "Team", ColorNeutral, members)
	assert.NoError(t, err)
	assert.Len(t, team.Members, 1)
}
