package user

import (
	"time"

	"github.com/getbud-co/bud2/backend/internal/domain/membership"
	usr "github.com/getbud-co/bud2/backend/internal/domain/user"
)

type Response struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	Email         string `json:"email"`
	Status        string `json:"status"`
	IsSystemAdmin bool   `json:"is_system_admin"`
	CreatedAt     string `json:"created_at"`
	UpdatedAt     string `json:"updated_at"`
}

type MembershipResponse struct {
	ID              string  `json:"id"`
	OrganizationID  string  `json:"organization_id"`
	UserID          string  `json:"user_id"`
	Role            string  `json:"role"`
	Status          string  `json:"status"`
	InvitedByUserID *string `json:"invited_by_user_id,omitempty"`
	JoinedAt        *string `json:"joined_at,omitempty"`
	CreatedAt       string  `json:"created_at"`
	UpdatedAt       string  `json:"updated_at"`
}

type ListResponse struct {
	Data  []Response `json:"data"`
	Total int64      `json:"total"`
	Page  int        `json:"page"`
	Size  int        `json:"size"`
}

func toResponse(u *usr.User) Response {
	return Response{
		ID:            u.ID.String(),
		Name:          u.Name,
		Email:         u.Email,
		Status:        string(u.Status),
		IsSystemAdmin: u.IsSystemAdmin,
		CreatedAt:     u.CreatedAt.Format(time.RFC3339),
		UpdatedAt:     u.UpdatedAt.Format(time.RFC3339),
	}
}

func toMembershipResponse(m *membership.Membership) MembershipResponse {
	resp := MembershipResponse{
		ID:             m.ID.String(),
		OrganizationID: m.OrganizationID.String(),
		UserID:         m.UserID.String(),
		Role:           string(m.Role),
		Status:         string(m.Status),
		CreatedAt:      m.CreatedAt.Format(time.RFC3339),
		UpdatedAt:      m.UpdatedAt.Format(time.RFC3339),
	}
	if m.InvitedByUserID != nil {
		value := m.InvitedByUserID.String()
		resp.InvitedByUserID = &value
	}
	if m.JoinedAt != nil {
		value := m.JoinedAt.Format(time.RFC3339)
		resp.JoinedAt = &value
	}
	return resp
}
