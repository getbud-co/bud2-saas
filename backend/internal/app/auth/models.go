package auth

import (
	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain/organization"
	"github.com/getbud-co/bud2/backend/internal/domain/user"
)

type AccessibleOrganization struct {
	ID               uuid.UUID
	Name             string
	Domain           string
	Workspace        string
	Status           organization.Status
	MembershipRole   string
	MembershipStatus string
}

type Session struct {
	User               user.User
	ActiveOrganization *AccessibleOrganization
	Organizations      []AccessibleOrganization
}

func accessibleOrganizationFromOrganization(org *organization.Organization) AccessibleOrganization {
	return AccessibleOrganization{
		ID:        org.ID,
		Name:      org.Name,
		Domain:    org.Domain,
		Workspace: org.Workspace,
		Status:    org.Status,
	}
}

func accessibleOrganizationFromMembership(org *organization.Organization, m *organization.Membership) AccessibleOrganization {
	result := accessibleOrganizationFromOrganization(org)
	result.MembershipRole = string(m.Role)
	result.MembershipStatus = string(m.Status)
	return result
}
