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

type updateTestTxRepos struct {
	userRepo usr.Repository
}

func (r updateTestTxRepos) Organizations() organization.Repository { return nil }
func (r updateTestTxRepos) Users() usr.Repository                  { return r.userRepo }

type updateTestTxManager struct {
	repos     apptx.Repositories
	called    bool
	returnErr error
}

func (m *updateTestTxManager) WithTx(ctx context.Context, fn func(repos apptx.Repositories) error) error {
	m.called = true
	if m.returnErr != nil {
		return m.returnErr
	}
	return fn(m.repos)
}

func TestUpdateUseCase_Execute_Success(t *testing.T) {
	txUsers := new(mocks.UserRepository)
	txm := &updateTestTxManager{repos: updateTestTxRepos{userRepo: txUsers}}
	uc := NewUpdateUseCase(txUsers, txm, testutil.NewDiscardLogger())

	tenantID := fixtures.NewTestTenantID()
	testUser := fixtures.NewUserWithMembership()
	testUser.Memberships[0].OrganizationID = tenantID.UUID()
	updatedUser := fixtures.NewUserWithMembership()
	updatedUser.Name = "Updated Name"
	updatedUser.Memberships[0].OrganizationID = tenantID.UUID()
	updatedUser.Memberships[0].Role = membership.RoleManager

	txUsers.On("GetByID", mock.Anything, testUser.ID).Return(testUser, nil)
	txUsers.On("Update", mock.Anything, mock.Anything).Return(updatedUser, nil)

	result, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID, ID: testUser.ID, Name: "Updated Name", Email: testUser.Email, Status: "active",
	})

	assert.NoError(t, err)
	assert.Equal(t, "Updated Name", result.Name)
	assert.True(t, txm.called)
}

func TestUpdateUseCase_Execute_UserNotFound(t *testing.T) {
	txm := &updateTestTxManager{returnErr: usr.ErrNotFound}
	uc := NewUpdateUseCase(new(mocks.UserRepository), txm, testutil.NewDiscardLogger())

	userID := uuid.New()

	result, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: fixtures.NewTestTenantID(), ID: userID, Name: "Test", Email: "test@example.com", Status: "active",
	})

	assert.ErrorIs(t, err, usr.ErrNotFound)
	assert.Nil(t, result)
}

func TestUpdateUseCase_Execute_MembershipNotFound(t *testing.T) {
	txUsers := new(mocks.UserRepository)
	txm := &updateTestTxManager{repos: updateTestTxRepos{userRepo: txUsers}}
	uc := NewUpdateUseCase(txUsers, txm, testutil.NewDiscardLogger())

	tenantID := fixtures.NewTestTenantID()
	testUser := fixtures.NewUser()

	txUsers.On("GetByID", mock.Anything, testUser.ID).Return(testUser, nil)

	result, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID, ID: testUser.ID, Name: "Test", Email: testUser.Email, Status: "active",
	})

	assert.ErrorIs(t, err, membership.ErrNotFound)
	assert.Nil(t, result)
}

func TestUpdateUseCase_Execute_EmailConflict(t *testing.T) {
	txUsers := new(mocks.UserRepository)
	txm := &updateTestTxManager{repos: updateTestTxRepos{userRepo: txUsers}}
	uc := NewUpdateUseCase(txUsers, txm, testutil.NewDiscardLogger())

	tenantID := fixtures.NewTestTenantID()
	testUser := fixtures.NewUserWithMembership()
	testUser.Memberships[0].OrganizationID = tenantID.UUID()
	otherUser := fixtures.NewUser()
	otherUser.ID = uuid.New()
	otherUser.Email = "other@example.com"

	txUsers.On("GetByID", mock.Anything, testUser.ID).Return(testUser, nil)
	txUsers.On("GetByEmail", mock.Anything, "other@example.com").Return(otherUser, nil)

	result, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID, ID: testUser.ID, Name: testUser.Name, Email: "other@example.com", Status: "active",
	})

	assert.ErrorIs(t, err, usr.ErrEmailExists)
	assert.Nil(t, result)
}

func TestUpdateUseCase_Execute_SameEmailNoConflict(t *testing.T) {
	txUsers := new(mocks.UserRepository)
	txm := &updateTestTxManager{repos: updateTestTxRepos{userRepo: txUsers}}
	uc := NewUpdateUseCase(txUsers, txm, testutil.NewDiscardLogger())

	tenantID := fixtures.NewTestTenantID()
	testUser := fixtures.NewUserWithMembership()
	testUser.Memberships[0].OrganizationID = tenantID.UUID()

	txUsers.On("GetByID", mock.Anything, testUser.ID).Return(testUser, nil)
	txUsers.On("Update", mock.Anything, mock.Anything).Return(testUser, nil)

	result, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID, ID: testUser.ID, Name: testUser.Name, Email: testUser.Email, Status: "active",
	})

	assert.NoError(t, err)
	assert.NotNil(t, result)
	txUsers.AssertNotCalled(t, "GetByEmail")
}

func TestUpdateUseCase_Execute_InvalidMembershipStatus(t *testing.T) {
	txUsers := new(mocks.UserRepository)
	txm := &updateTestTxManager{repos: updateTestTxRepos{userRepo: txUsers}}
	uc := NewUpdateUseCase(txUsers, txm, testutil.NewDiscardLogger())

	tenantID := fixtures.NewTestTenantID()
	testUser := fixtures.NewUserWithMembership()
	testUser.Memberships[0].OrganizationID = tenantID.UUID()

	txUsers.On("GetByID", mock.Anything, testUser.ID).Return(testUser, nil)

	result, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID, ID: testUser.ID, Name: testUser.Name, Email: testUser.Email, Status: "invalid",
	})

	assert.Error(t, err)
	assert.Nil(t, result)
}

func TestUpdateUseCase_Execute_GetByEmailError(t *testing.T) {
	txUsers := new(mocks.UserRepository)
	txm := &updateTestTxManager{repos: updateTestTxRepos{userRepo: txUsers}}
	uc := NewUpdateUseCase(txUsers, txm, testutil.NewDiscardLogger())

	tenantID := fixtures.NewTestTenantID()
	testUser := fixtures.NewUserWithMembership()
	testUser.Memberships[0].OrganizationID = tenantID.UUID()

	txUsers.On("GetByID", mock.Anything, testUser.ID).Return(testUser, nil)
	txUsers.On("GetByEmail", mock.Anything, "new@example.com").Return(nil, errors.New("db error"))

	result, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID, ID: testUser.ID, Name: testUser.Name, Email: "new@example.com", Status: "active",
	})

	assert.Error(t, err)
	assert.Nil(t, result)
}

func TestUpdateUseCase_Execute_UserUpdateError(t *testing.T) {
	txUsers := new(mocks.UserRepository)
	txm := &updateTestTxManager{repos: updateTestTxRepos{userRepo: txUsers}}
	uc := NewUpdateUseCase(txUsers, txm, testutil.NewDiscardLogger())

	tenantID := fixtures.NewTestTenantID()
	testUser := fixtures.NewUserWithMembership()
	testUser.Memberships[0].OrganizationID = tenantID.UUID()

	txUsers.On("GetByID", mock.Anything, testUser.ID).Return(testUser, nil)
	txUsers.On("Update", mock.Anything, mock.Anything).Return(nil, errors.New("db error"))

	result, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID, ID: testUser.ID, Name: testUser.Name, Email: testUser.Email, Status: "active",
	})

	assert.Error(t, err)
	assert.Nil(t, result)
}

func TestUpdateUseCase_Execute_TransactionError(t *testing.T) {
	txm := &updateTestTxManager{returnErr: errors.New("tx error")}
	uc := NewUpdateUseCase(new(mocks.UserRepository), txm, testutil.NewDiscardLogger())

	result, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: fixtures.NewTestTenantID(), ID: uuid.New(), Name: "Test", Email: "test@example.com", Status: "active",
	})

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.True(t, txm.called)
}
