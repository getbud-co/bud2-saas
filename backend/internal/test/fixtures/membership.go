package fixtures

import (
	"time"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain/organization"
)

func NewMembership() *organization.Membership {
	return &organization.Membership{
		ID:             uuid.MustParse("770e8400-e29b-41d4-a716-446655440000"),
		OrganizationID: uuid.MustParse("550e8400-e29b-41d4-a716-446655440000"),
		UserID:         uuid.MustParse("660e8400-e29b-41d4-a716-446655440000"),
		Role:           organization.MembershipRoleSuperAdmin,
		Status:         organization.MembershipStatusActive,
		CreatedAt:      time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
		UpdatedAt:      time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
	}
}

func NewMembershipWithRole(role organization.MembershipRole) *organization.Membership {
	m := NewMembership()
	m.Role = role
	return m
}
