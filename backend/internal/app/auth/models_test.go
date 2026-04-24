package auth

import (
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/getbud-co/bud2/backend/internal/domain/organization"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
)

func TestAccessibleOrganizationFromOrganization_DoesNotIncludeMembershipFields(t *testing.T) {
	org := fixtures.NewOrganization()

	result := accessibleOrganizationFromOrganization(org)

	assert.Equal(t, org.ID, result.ID)
	assert.Equal(t, org.Name, result.Name)
	assert.Empty(t, result.MembershipRole)
	assert.Empty(t, result.MembershipStatus)
}

func TestAccessibleOrganizationFromMembership_IncludesMembershipFields(t *testing.T) {
	org := fixtures.NewOrganization()
	m := fixtures.NewMembershipWithRole(organization.MembershipRoleGestor)
	m.Status = organization.MembershipStatusInactive

	result := accessibleOrganizationFromMembership(org, m)

	assert.Equal(t, org.ID, result.ID)
	assert.Equal(t, "gestor", result.MembershipRole)
	assert.Equal(t, "inactive", result.MembershipStatus)
}
