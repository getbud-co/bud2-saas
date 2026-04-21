package auth

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/getbud-co/bud2/backend/internal/domain"
	org "github.com/getbud-co/bud2/backend/internal/domain/organization"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func TestGetSessionUseCase_Execute_UsesClaimedActiveOrganization(t *testing.T) {
	users := new(mocks.UserRepository)
	organizations := new(mocks.OrganizationRepository)
	uc := NewGetSessionUseCase(users, organizations, new(mocks.TokenIssuer), new(mocks.PasswordHasher), testutil.NewDiscardLogger())

	orgA := fixtures.NewOrganization()
	orgB := fixtures.NewOrganizationWithName("Second Org", "second")
	orgB.ID = uuid.New()
	orgB.Domain = "second.example.com"

	u := fixtures.NewUserWithMembership()
	u.Email = "member@alpha.example.com"
	u.PasswordHash = "hashed-password"
	u.Memberships[0].OrganizationID = orgA.ID
	u.Memberships = append(u.Memberships, *fixtures.NewMembership())
	u.Memberships[1].OrganizationID = orgB.ID
	u.Memberships[1].Role = "manager"

	users.On("GetByID", mock.Anything, u.ID).Return(u, nil)
	organizations.On("GetByID", mock.Anything, orgA.ID).Return(orgA, nil)
	organizations.On("GetByID", mock.Anything, orgB.ID).Return(orgB, nil)

	result, err := uc.Execute(context.Background(), domain.UserClaims{
		UserID:                domain.UserID(u.ID),
		ActiveOrganizationID:  domain.TenantID(orgB.ID),
		HasActiveOrganization: true,
	})

	require.NoError(t, err)
	require.NotNil(t, result.ActiveOrganization)
	assert.Equal(t, orgB.ID, result.ActiveOrganization.ID)
	assert.Empty(t, result.User.PasswordHash)
	assert.Len(t, result.Organizations, 2)
}

func TestGetSessionUseCase_Execute_SystemAdminListsAllOrganizations(t *testing.T) {
	users := new(mocks.UserRepository)
	organizations := new(mocks.OrganizationRepository)
	uc := NewGetSessionUseCase(users, organizations, new(mocks.TokenIssuer), new(mocks.PasswordHasher), testutil.NewDiscardLogger())

	u := fixtures.NewSystemAdmin()
	orgs := []org.Organization{*fixtures.NewOrganization(), *fixtures.NewInactiveOrganization()}
	orgs[1].ID = uuid.New()

	users.On("GetByID", mock.Anything, u.ID).Return(u, nil)
	organizations.On("List", mock.Anything, org.ListFilter{Page: 1, Size: 1000}).Return(org.ListResult{
		Organizations: orgs,
		Total:         int64(len(orgs)),
	}, nil)

	result, err := uc.Execute(context.Background(), domain.UserClaims{UserID: domain.UserID(u.ID), IsSystemAdmin: true})

	require.NoError(t, err)
	assert.Nil(t, result.ActiveOrganization)
	assert.Len(t, result.Organizations, 2)
	assert.True(t, result.User.IsSystemAdmin)
}
