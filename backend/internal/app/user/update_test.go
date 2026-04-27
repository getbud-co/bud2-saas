package user

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	apptx "github.com/getbud-co/bud2/backend/internal/app/tx"
	domainindicator "github.com/getbud-co/bud2/backend/internal/domain/indicator"
	domainmission "github.com/getbud-co/bud2/backend/internal/domain/mission"
	"github.com/getbud-co/bud2/backend/internal/domain/organization"
	domaintask "github.com/getbud-co/bud2/backend/internal/domain/task"
	"github.com/getbud-co/bud2/backend/internal/domain/team"
	usr "github.com/getbud-co/bud2/backend/internal/domain/user"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

type updateTestTxRepos struct {
	userRepo usr.Repository
	teamRepo team.Repository
}

func (r updateTestTxRepos) Organizations() organization.Repository { return nil }
func (r updateTestTxRepos) Users() usr.Repository                  { return r.userRepo }
func (r updateTestTxRepos) Teams() team.Repository {
	if r.teamRepo != nil {
		return r.teamRepo
	}
	// Return a mock that returns empty members by default (for ListMembersByUser calls).
	m := new(mocks.TeamRepository)
	m.On("ListMembersByUser", mock.Anything, mock.Anything, mock.Anything).Return([]team.TeamMember{}, nil)
	return m
}
func (r updateTestTxRepos) Missions() domainmission.Repository     { return nil }
func (r updateTestTxRepos) Indicators() domainindicator.Repository { return nil }
func (r updateTestTxRepos) Tasks() domaintask.Repository           { return nil }

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
	updatedUser.FirstName = "Updated"
	updatedUser.LastName = "Name"
	updatedUser.Memberships[0].OrganizationID = tenantID.UUID()
	updatedUser.Memberships[0].Role = organization.MembershipRoleGestor

	txUsers.On("GetByIDForOrganization", mock.Anything, testUser.ID, tenantID.UUID()).Return(testUser, nil)
	txUsers.On("Update", mock.Anything, mock.Anything).Return(updatedUser, nil)

	result, _, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID, ID: testUser.ID, FirstName: "Updated", LastName: "Name", Email: testUser.Email, Status: "active",
	})

	assert.NoError(t, err)
	assert.Equal(t, "Updated", result.FirstName)
	assert.True(t, txm.called)
}

func TestUpdateUseCase_Execute_UserNotFound(t *testing.T) {
	txm := &updateTestTxManager{returnErr: usr.ErrNotFound}
	uc := NewUpdateUseCase(new(mocks.UserRepository), txm, testutil.NewDiscardLogger())

	userID := uuid.New()

	result, _, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: fixtures.NewTestTenantID(), ID: userID, FirstName: "Test", LastName: "User", Email: "test@example.com", Status: "active",
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

	txUsers.On("GetByIDForOrganization", mock.Anything, testUser.ID, tenantID.UUID()).Return(nil, organization.ErrMembershipNotFound)

	result, _, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID, ID: testUser.ID, FirstName: "Test", LastName: "User", Email: testUser.Email, Status: "active",
	})

	assert.ErrorIs(t, err, organization.ErrMembershipNotFound)
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

	txUsers.On("GetByIDForOrganization", mock.Anything, testUser.ID, tenantID.UUID()).Return(testUser, nil)
	txUsers.On("GetByEmail", mock.Anything, "other@example.com").Return(otherUser, nil)

	result, _, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID, ID: testUser.ID, FirstName: testUser.FirstName, LastName: testUser.LastName, Email: "other@example.com", Status: "active",
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

	txUsers.On("GetByIDForOrganization", mock.Anything, testUser.ID, tenantID.UUID()).Return(testUser, nil)
	txUsers.On("Update", mock.Anything, mock.Anything).Return(testUser, nil)

	result, _, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID, ID: testUser.ID, FirstName: testUser.FirstName, LastName: testUser.LastName, Email: testUser.Email, Status: "active",
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

	txUsers.On("GetByIDForOrganization", mock.Anything, testUser.ID, tenantID.UUID()).Return(testUser, nil)

	result, _, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID, ID: testUser.ID, FirstName: testUser.FirstName, LastName: testUser.LastName, Email: testUser.Email, Status: "invalid",
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

	txUsers.On("GetByIDForOrganization", mock.Anything, testUser.ID, tenantID.UUID()).Return(testUser, nil)
	txUsers.On("GetByEmail", mock.Anything, "new@example.com").Return(nil, errors.New("db error"))

	result, _, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID, ID: testUser.ID, FirstName: testUser.FirstName, LastName: testUser.LastName, Email: "new@example.com", Status: "active",
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

	txUsers.On("GetByIDForOrganization", mock.Anything, testUser.ID, tenantID.UUID()).Return(testUser, nil)
	txUsers.On("Update", mock.Anything, mock.Anything).Return(nil, errors.New("db error"))

	result, _, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID, ID: testUser.ID, FirstName: testUser.FirstName, LastName: testUser.LastName, Email: testUser.Email, Status: "active",
	})

	assert.Error(t, err)
	assert.Nil(t, result)
}

func TestUpdateUseCase_Execute_TransactionError(t *testing.T) {
	txm := &updateTestTxManager{returnErr: errors.New("tx error")}
	uc := NewUpdateUseCase(new(mocks.UserRepository), txm, testutil.NewDiscardLogger())

	result, _, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: fixtures.NewTestTenantID(), ID: uuid.New(), FirstName: "Test", LastName: "User", Email: "test@example.com", Status: "active",
	})

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.True(t, txm.called)
}
