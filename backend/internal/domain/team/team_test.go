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
