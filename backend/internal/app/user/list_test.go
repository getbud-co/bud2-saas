package user

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"

	usr "github.com/getbud-co/bud2/backend/internal/domain/user"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func TestListUseCase_Execute_Success(t *testing.T) {
	users := new(mocks.UserRepository)
	uc := NewListUseCase(users, testutil.NewDiscardLogger())

	tenantID := fixtures.NewTestTenantID()
	testUser := fixtures.NewUserWithMembership()
	testUser.Memberships[0].OrganizationID = tenantID.UUID()

	users.On("ListByOrganization", t.Context(), tenantID.UUID(), (*usr.Status)(nil), 1, 20).Return(usr.ListResult{
		Users: []usr.User{*testUser},
		Total: 1,
	}, nil)

	result, err := uc.Execute(t.Context(), ListCommand{
		OrganizationID: tenantID, Page: 1, Size: 20,
	})

	assert.NoError(t, err)
	assert.Len(t, result.Users, 1)
	assert.Equal(t, int64(1), result.Total)
}

func TestListUseCase_Execute_WithStatusFilter(t *testing.T) {
	users := new(mocks.UserRepository)
	uc := NewListUseCase(users, testutil.NewDiscardLogger())

	tenantID := fixtures.NewTestTenantID()
	status := "active"
	userStatus := usr.StatusActive

	users.On("ListByOrganization", t.Context(), tenantID.UUID(), &userStatus, 1, 20).Return(usr.ListResult{}, nil)

	_, err := uc.Execute(t.Context(), ListCommand{
		OrganizationID: tenantID, Status: &status, Page: 1, Size: 20,
	})

	assert.NoError(t, err)
}

func TestListUseCase_Execute_DefaultPagination(t *testing.T) {
	users := new(mocks.UserRepository)
	uc := NewListUseCase(users, testutil.NewDiscardLogger())

	tenantID := fixtures.NewTestTenantID()

	users.On("ListByOrganization", t.Context(), tenantID.UUID(), (*usr.Status)(nil), 1, 20).Return(usr.ListResult{}, nil)

	_, err := uc.Execute(t.Context(), ListCommand{OrganizationID: tenantID})

	assert.NoError(t, err)
}

func TestListUseCase_Execute_MaxSizeLimit(t *testing.T) {
	users := new(mocks.UserRepository)
	uc := NewListUseCase(users, testutil.NewDiscardLogger())

	tenantID := fixtures.NewTestTenantID()

	users.On("ListByOrganization", t.Context(), tenantID.UUID(), (*usr.Status)(nil), 1, 100).Return(usr.ListResult{}, nil)

	_, err := uc.Execute(t.Context(), ListCommand{
		OrganizationID: tenantID, Page: 1, Size: 500,
	})

	assert.NoError(t, err)
}

func TestListUseCase_Execute_MembershipListError(t *testing.T) {
	users := new(mocks.UserRepository)
	uc := NewListUseCase(users, testutil.NewDiscardLogger())

	tenantID := fixtures.NewTestTenantID()

	users.On("ListByOrganization", t.Context(), tenantID.UUID(), (*usr.Status)(nil), 1, 20).Return(usr.ListResult{}, errors.New("db error"))

	result, err := uc.Execute(t.Context(), ListCommand{
		OrganizationID: tenantID, Page: 1, Size: 20,
	})

	assert.Error(t, err)
	assert.Empty(t, result.Users)
}

func TestListUseCase_Execute_SuccessWithoutMembershipProjection(t *testing.T) {
	users := new(mocks.UserRepository)
	uc := NewListUseCase(users, testutil.NewDiscardLogger())

	tenantID := fixtures.NewTestTenantID()
	testUser := fixtures.NewUser()

	users.On("ListByOrganization", t.Context(), tenantID.UUID(), (*usr.Status)(nil), 1, 20).Return(usr.ListResult{
		Users: []usr.User{*testUser},
		Total: 1,
	}, nil)

	result, err := uc.Execute(t.Context(), ListCommand{
		OrganizationID: tenantID, Page: 1, Size: 20,
	})

	assert.NoError(t, err)
	assert.Len(t, result.Users, 1)
}
