package user

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	apptx "github.com/getbud-co/bud2/backend/internal/app/tx"
	"github.com/getbud-co/bud2/backend/internal/domain/membership"
	"github.com/getbud-co/bud2/backend/internal/domain/organization"
	usr "github.com/getbud-co/bud2/backend/internal/domain/user"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

type deleteUserTestTxRepos struct {
	userRepo usr.Repository
}

func (r deleteUserTestTxRepos) Organizations() organization.Repository { return nil }
func (r deleteUserTestTxRepos) Users() usr.Repository                  { return r.userRepo }

type deleteUserTestTxManager struct {
	repos     apptx.Repositories
	called    bool
	returnErr error
}

func (m *deleteUserTestTxManager) WithTx(ctx context.Context, fn func(repos apptx.Repositories) error) error {
	m.called = true
	if m.returnErr != nil {
		return m.returnErr
	}
	return fn(m.repos)
}

func TestDeleteUseCase_Execute_Success(t *testing.T) {
	txUsers := new(mocks.UserRepository)
	txm := &deleteUserTestTxManager{repos: deleteUserTestTxRepos{userRepo: txUsers}}
	uc := NewDeleteUseCase(txm, testutil.NewDiscardLogger())

	organizationID := fixtures.NewTestTenantID()
	targetUser := fixtures.NewUserWithMembership()
	targetUser.Memberships[0].OrganizationID = organizationID.UUID()

	txUsers.On("GetByIDForOrganization", mock.Anything, targetUser.ID, organizationID.UUID()).Return(targetUser, nil)
	txUsers.On("DeleteMembership", mock.Anything, organizationID.UUID(), targetUser.ID).Return(nil)

	err := uc.Execute(context.Background(), DeleteCommand{
		OrganizationID:  organizationID,
		RequesterUserID: uuid.New(),
		TargetUserID:    targetUser.ID,
	})

	assert.NoError(t, err)
	assert.True(t, txm.called)
}

func TestDeleteUseCase_Execute_RejectsSelfDelete(t *testing.T) {
	userID := uuid.New()
	uc := NewDeleteUseCase(&deleteUserTestTxManager{}, testutil.NewDiscardLogger())

	err := uc.Execute(context.Background(), DeleteCommand{
		OrganizationID:  fixtures.NewTestTenantID(),
		RequesterUserID: userID,
		TargetUserID:    userID,
	})

	assert.ErrorIs(t, err, ErrCannotDeleteOwnMembership)
}

func TestDeleteUseCase_Execute_MembershipNotFound(t *testing.T) {
	txUsers := new(mocks.UserRepository)
	txm := &deleteUserTestTxManager{repos: deleteUserTestTxRepos{userRepo: txUsers}}
	uc := NewDeleteUseCase(txm, testutil.NewDiscardLogger())

	targetUser := fixtures.NewUser()
	organizationID := fixtures.NewTestTenantID()
	txUsers.On("GetByIDForOrganization", mock.Anything, targetUser.ID, organizationID.UUID()).Return(nil, membership.ErrNotFound)

	err := uc.Execute(context.Background(), DeleteCommand{
		OrganizationID:  organizationID,
		RequesterUserID: uuid.New(),
		TargetUserID:    targetUser.ID,
	})

	assert.ErrorIs(t, err, membership.ErrNotFound)
}

func TestDeleteUseCase_Execute_TransactionError(t *testing.T) {
	txm := &deleteUserTestTxManager{returnErr: errors.New("tx error")}
	uc := NewDeleteUseCase(txm, testutil.NewDiscardLogger())

	err := uc.Execute(context.Background(), DeleteCommand{
		OrganizationID:  fixtures.NewTestTenantID(),
		RequesterUserID: uuid.New(),
		TargetUserID:    uuid.New(),
	})

	assert.Error(t, err)
	assert.True(t, txm.called)
}
