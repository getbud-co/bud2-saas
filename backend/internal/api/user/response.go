package user

import (
	"time"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain/membership"
	usr "github.com/getbud-co/bud2/backend/internal/domain/user"
)

type Response struct {
	ID               string  `json:"id"`
	FirstName        string  `json:"first_name"`
	LastName         string  `json:"last_name"`
	Email            string  `json:"email"`
	Status           string  `json:"status"`
	IsSystemAdmin    bool    `json:"is_system_admin"`
	Nickname         *string `json:"nickname,omitempty"`
	JobTitle         *string `json:"job_title,omitempty"`
	BirthDate        *string `json:"birth_date,omitempty"`
	Language         string  `json:"language"`
	Gender           *string `json:"gender,omitempty"`
	Phone            *string `json:"phone,omitempty"`
	Role             *string `json:"role,omitempty"`
	MembershipStatus *string `json:"membership_status,omitempty"`
	CreatedAt        string  `json:"created_at"`
	UpdatedAt        string  `json:"updated_at"`
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
	resp := Response{
		ID:            u.ID.String(),
		FirstName:     u.FirstName,
		LastName:      u.LastName,
		Email:         u.Email,
		Status:        string(u.Status),
		IsSystemAdmin: u.IsSystemAdmin,
		Nickname:      u.Nickname,
		JobTitle:      u.JobTitle,
		Language:      u.Language,
		Gender:        u.Gender,
		Phone:         u.Phone,
		CreatedAt:     u.CreatedAt.Format(time.RFC3339),
		UpdatedAt:     u.UpdatedAt.Format(time.RFC3339),
	}
	if u.BirthDate != nil {
		s := u.BirthDate.Format("2006-01-02")
		resp.BirthDate = &s
	}
	return resp
}

func toResponseForOrganization(u *usr.User, orgID uuid.UUID) Response {
	resp := toResponse(u)
	if m, err := u.MembershipForOrganization(orgID); err == nil {
		role := string(m.Role)
		resp.Role = &role
		mStatus := string(m.Status)
		resp.MembershipStatus = &mStatus
	}
	return resp
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
