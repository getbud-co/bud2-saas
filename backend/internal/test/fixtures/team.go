package fixtures

import (
	"time"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain/team"
)

func NewTeam() *team.Team {
	leaderUserID := uuid.MustParse("770e8400-e29b-41d4-a716-446655440001")
	return &team.Team{
		ID:             uuid.MustParse("880e8400-e29b-41d4-a716-446655440002"),
		OrganizationID: uuid.MustParse("550e8400-e29b-41d4-a716-446655440000"),
		Name:           "Engenharia",
		Description:    nil,
		Color:          team.ColorNeutral,
		Status:         team.StatusActive,
		Members: []team.TeamMember{
			{
				ID:         uuid.MustParse("990e8400-e29b-41d4-a716-446655440003"),
				TeamID:     uuid.MustParse("880e8400-e29b-41d4-a716-446655440002"),
				UserID:     leaderUserID,
				RoleInTeam: team.RoleLeader,
				JoinedAt:   time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
				CreatedAt:  time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
				UpdatedAt:  time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
			},
		},
		CreatedAt: time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
		UpdatedAt: time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
	}
}

func NewTeamWithName(name string) *team.Team {
	t := NewTeam()
	t.Name = name
	return t
}
