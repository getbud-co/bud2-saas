package auth

import (
	"testing"

	"github.com/stretchr/testify/assert"

	appauth "github.com/getbud-co/bud2/backend/internal/app/auth"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
)

func TestResponseFromSession(t *testing.T) {
	testUser := fixtures.NewUser()
	testOrg := fixtures.NewOrganization()
	session := appauth.Session{
		User: *testUser,
		ActiveOrganization: &appauth.AccessibleOrganization{
			ID:               testOrg.ID,
			Name:             testOrg.Name,
			Domain:           testOrg.Domain,
			Workspace:        testOrg.Workspace,
			Status:           testOrg.Status,
			MembershipRole:   "admin",
			MembershipStatus: "active",
		},
		Organizations: []appauth.AccessibleOrganization{{
			ID:               testOrg.ID,
			Name:             testOrg.Name,
			Domain:           testOrg.Domain,
			Workspace:        testOrg.Workspace,
			Status:           testOrg.Status,
			MembershipRole:   "admin",
			MembershipStatus: "active",
		}},
	}

	resp := responseFromSession(session)

	assert.Equal(t, testUser.ID.String(), resp.User.ID)
	assert.NotNil(t, resp.ActiveOrganization)
	assert.Equal(t, testOrg.ID.String(), resp.ActiveOrganization.ID)
	assert.Len(t, resp.Organizations, 1)
	assert.Equal(t, "admin", resp.Organizations[0].MembershipRole)
}

func TestResponseFromSession_NoActiveOrganization(t *testing.T) {
	session := appauth.Session{User: *fixtures.NewUser()}

	resp := responseFromSession(session)

	assert.Nil(t, resp.ActiveOrganization)
	assert.Empty(t, resp.Organizations)
}
