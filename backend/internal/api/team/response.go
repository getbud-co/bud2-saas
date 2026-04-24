package team

import (
	"strings"
	"time"

	domainteam "github.com/getbud-co/bud2/backend/internal/domain/team"
)

type MemberUserResponse struct {
	ID        string  `json:"id"`
	FirstName string  `json:"first_name"`
	LastName  string  `json:"last_name"`
	Initials  *string `json:"initials"`
	JobTitle  *string `json:"job_title"`
	AvatarURL *string `json:"avatar_url"`
}

type MemberResponse struct {
	TeamID     string              `json:"team_id"`
	UserID     string              `json:"user_id"`
	RoleInTeam string              `json:"role_in_team"`
	JoinedAt   string              `json:"joined_at"`
	User       *MemberUserResponse `json:"user,omitempty"`
}

type Response struct {
	ID          string           `json:"id"`
	OrgID       string           `json:"org_id"`
	Name        string           `json:"name"`
	Description *string          `json:"description,omitempty"`
	Color       string           `json:"color"`
	Status      string           `json:"status"`
	Members     []MemberResponse `json:"members"`
	MemberCount int              `json:"member_count"`
	CreatedAt   string           `json:"created_at"`
	UpdatedAt   string           `json:"updated_at"`
}

type ListResponse struct {
	Data  []Response `json:"data"`
	Total int64      `json:"total"`
	Page  int        `json:"page"`
	Size  int        `json:"size"`
}

func toResponse(t *domainteam.Team) Response {
	members := make([]MemberResponse, 0, len(t.Members))
	for _, m := range t.Members {
		mr := MemberResponse{
			TeamID:     m.TeamID.String(),
			UserID:     m.UserID.String(),
			RoleInTeam: string(m.RoleInTeam),
			JoinedAt:   m.JoinedAt.Format(time.RFC3339),
		}
		if m.UserFirstName != nil && m.UserLastName != nil {
			initials := initials(*m.UserFirstName, *m.UserLastName)
			mr.User = &MemberUserResponse{
				ID:        m.UserID.String(),
				FirstName: *m.UserFirstName,
				LastName:  *m.UserLastName,
				Initials:  &initials,
				JobTitle:  m.UserJobTitle,
				AvatarURL: nil,
			}
		}
		members = append(members, mr)
	}

	return Response{
		ID:          t.ID.String(),
		OrgID:       t.OrganizationID.String(),
		Name:        t.Name,
		Description: t.Description,
		Color:       string(t.Color),
		Status:      string(t.Status),
		Members:     members,
		MemberCount: len(members),
		CreatedAt:   t.CreatedAt.Format(time.RFC3339),
		UpdatedAt:   t.UpdatedAt.Format(time.RFC3339),
	}
}

// initials derives a two-letter initials string from first and last name.
func initials(firstName, lastName string) string {
	var sb strings.Builder
	if len(firstName) > 0 {
		sb.WriteRune([]rune(strings.ToUpper(firstName))[0])
	}
	if len(lastName) > 0 {
		sb.WriteRune([]rune(strings.ToUpper(lastName))[0])
	}
	return sb.String()
}
