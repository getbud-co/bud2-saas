package user

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"

	"github.com/getbud-co/bud2/backend/internal/domain/membership"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
)

func TestToResponse(t *testing.T) {
	u := fixtures.NewUser()

	resp := toResponse(u)

	assert.Equal(t, u.ID.String(), resp.ID)
	assert.Equal(t, u.FirstName, resp.FirstName)
	assert.Equal(t, u.LastName, resp.LastName)
	assert.Equal(t, u.Email, resp.Email)
	assert.Equal(t, "active", resp.Status)
	assert.Equal(t, u.IsSystemAdmin, resp.IsSystemAdmin)
	assert.Equal(t, u.CreatedAt.Format(time.RFC3339), resp.CreatedAt)
	assert.Equal(t, u.UpdatedAt.Format(time.RFC3339), resp.UpdatedAt)
}

func TestToResponseForOrganization_WithMatchingMembership(t *testing.T) {
	u := fixtures.NewUserWithMembership()
	m := u.Memberships[0]

	resp := toResponseForOrganization(u, m.OrganizationID)

	assert.Equal(t, u.ID.String(), resp.ID)
	assert.NotNil(t, resp.Role)
	assert.Equal(t, string(m.Role), *resp.Role)
	assert.NotNil(t, resp.MembershipStatus)
	assert.Equal(t, string(m.Status), *resp.MembershipStatus)
}

func TestToResponseForOrganization_NoMatchingMembership(t *testing.T) {
	u := fixtures.NewUser() // no memberships

	resp := toResponseForOrganization(u, u.ID) // any orgID, no match

	assert.Equal(t, u.ID.String(), resp.ID)
	assert.Nil(t, resp.Role)
	assert.Nil(t, resp.MembershipStatus)
}

func TestToMembershipResponse(t *testing.T) {
	m := fixtures.NewMembership()
	m.Role = membership.RoleSuperAdmin
	m.Status = membership.StatusActive

	resp := toMembershipResponse(m)

	assert.Equal(t, m.ID.String(), resp.ID)
	assert.Equal(t, m.OrganizationID.String(), resp.OrganizationID)
	assert.Equal(t, m.UserID.String(), resp.UserID)
	assert.Equal(t, "super-admin", resp.Role)
	assert.Equal(t, "active", resp.Status)
	assert.Equal(t, m.CreatedAt.Format(time.RFC3339), resp.CreatedAt)
	assert.Equal(t, m.UpdatedAt.Format(time.RFC3339), resp.UpdatedAt)
}
