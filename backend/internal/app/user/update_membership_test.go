package user

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	apptx "github.com/getbud-co/bud2/backend/internal/app/tx"
	"github.com/getbud-co/bud2/backend/internal/domain"
	"github.com/getbud-co/bud2/backend/internal/domain/membership"
	org "github.com/getbud-co/bud2/backend/internal/domain/organization"
	usr "github.com/getbud-co/bud2/backend/internal/domain/user"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

type fakeTxManager struct {
	repos apptx.Repositories
}

func (m fakeTxManager) WithTx(ctx context.Context, fn func(repos apptx.Repositories) error) error {
	return fn(m.repos)
}

type fakeRepositories struct {
	users usr.Repository
	orgs  org.Repository
}

func (r fakeRepositories) Organizations() org.Repository { return r.orgs }
func (r fakeRepositories) Users() usr.Repository         { return r.users }

func TestUpdateMembershipUseCase_Execute_Success(t *testing.T) {
	users := new(mocks.UserRepository)
	uc := NewUpdateMembershipUseCase(fakeTxManager{repos: fakeRepositories{users: users}}, testutil.NewDiscardLogger())

	u := fixtures.NewUserWithMembership()
	organizationID := domain.TenantID(u.Memberships[0].OrganizationID)
	updated := fixtures.NewUserWithMembership()
	updated.ID = u.ID
	updated.Memberships[0].OrganizationID = u.Memberships[0].OrganizationID
	updated.Memberships[0].Role = membership.RoleManager
	updated.Memberships[0].Status = membership.StatusInactive

	users.On("GetByID", mock.Anything, u.ID).Return(u, nil)
	users.On("Update", mock.Anything, mock.MatchedBy(func(target *usr.User) bool {
		m, err := target.MembershipForOrganization(organizationID.UUID())
		return err == nil && m.Role == membership.RoleManager && m.Status == membership.StatusInactive
	})).Return(updated, nil)

	result, err := uc.Execute(context.Background(), UpdateMembershipCommand{
		OrganizationID: organizationID,
		ID:             u.ID,
		Role:           string(membership.RoleManager),
		Status:         string(membership.StatusInactive),
	})

	require.NoError(t, err)
	assert.Equal(t, membership.RoleManager, result.Role)
	assert.Equal(t, membership.StatusInactive, result.Status)
}

func TestUpdateMembershipUseCase_Execute_ReturnsNotFoundForOtherOrganization(t *testing.T) {
	users := new(mocks.UserRepository)
	uc := NewUpdateMembershipUseCase(fakeTxManager{repos: fakeRepositories{users: users}}, testutil.NewDiscardLogger())

	u := fixtures.NewUserWithMembership()
	users.On("GetByID", mock.Anything, u.ID).Return(u, nil)

	result, err := uc.Execute(context.Background(), UpdateMembershipCommand{
		OrganizationID: domain.TenantID(uuid.New()),
		ID:             u.ID,
		Role:           string(membership.RoleManager),
		Status:         string(membership.StatusInactive),
	})

	assert.ErrorIs(t, err, membership.ErrNotFound)
	assert.Nil(t, result)
	users.AssertNotCalled(t, "Update")
}

func TestUpdateMembershipUseCase_Execute_ValidationError(t *testing.T) {
	users := new(mocks.UserRepository)
	uc := NewUpdateMembershipUseCase(fakeTxManager{repos: fakeRepositories{users: users}}, testutil.NewDiscardLogger())

	u := fixtures.NewUserWithMembership()
	organizationID := domain.TenantID(u.Memberships[0].OrganizationID)
	users.On("GetByID", mock.Anything, u.ID).Return(u, nil)

	result, err := uc.Execute(context.Background(), UpdateMembershipCommand{
		OrganizationID: organizationID,
		ID:             u.ID,
		Role:           "invalid",
		Status:         string(membership.StatusInactive),
	})

	assert.Error(t, err)
	assert.Nil(t, result)
	users.AssertNotCalled(t, "Update")
}
