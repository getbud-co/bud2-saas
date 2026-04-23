package user

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	apptx "github.com/getbud-co/bud2/backend/internal/app/tx"
	"github.com/getbud-co/bud2/backend/internal/domain"
	"github.com/getbud-co/bud2/backend/internal/domain/membership"
	"github.com/getbud-co/bud2/backend/internal/domain/organization"
	usr "github.com/getbud-co/bud2/backend/internal/domain/user"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

type testTxRepos struct {
	orgRepo  organization.Repository
	userRepo usr.Repository
}

func (r testTxRepos) Organizations() organization.Repository { return r.orgRepo }
func (r testTxRepos) Users() usr.Repository                  { return r.userRepo }

type testTxManager struct {
	repos     apptx.Repositories
	called    bool
	returnErr error
	lastCtx   context.Context
}

func (m *testTxManager) WithTx(ctx context.Context, fn func(repos apptx.Repositories) error) error {
	m.called = true
	m.lastCtx = ctx
	if m.returnErr != nil {
		return m.returnErr
	}
	return fn(m.repos)
}

func TestCreateUseCase_Execute_Success_NewUser(t *testing.T) {
	users := new(mocks.UserRepository)
	organizations := new(mocks.OrganizationRepository)
	txUsers := new(mocks.UserRepository)
	txOrganizations := new(mocks.OrganizationRepository)
	hasher := new(mocks.PasswordHasher)
	txm := &testTxManager{repos: testTxRepos{orgRepo: txOrganizations, userRepo: txUsers}}
	uc := NewCreateUseCase(users, organizations, txm, hasher, testutil.NewDiscardLogger())

	tenantID := fixtures.NewTestTenantID()
	testOrg := fixtures.NewOrganization()
	createdUser := fixtures.NewUserWithEmail("new@example.com")
	createdUser.Memberships = []membership.Membership{{
		OrganizationID: tenantID.UUID(),
		Role:           membership.RoleSuperAdmin,
		Status:         membership.StatusInvited,
	}}

	users.On("GetByEmail", mock.Anything, "new@example.com").Return(nil, usr.ErrNotFound)
	organizations.On("GetByDomain", mock.Anything, "example.com").Return(testOrg, nil)
	hasher.On("Hash", "password123").Return("hashed", nil)
	txUsers.On("Create", mock.Anything, mock.Anything).Return(createdUser, nil)

	result, err := uc.Execute(context.Background(), CreateCommand{
		OrganizationID: tenantID, FirstName: "New", LastName: "User", Email: "new@example.com", Password: "password123", Role: "super-admin",
	})

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "new@example.com", result.Email)
	assert.True(t, txm.called)
}

func TestCreateUseCase_Execute_Success_ExistingUser(t *testing.T) {
	users := new(mocks.UserRepository)
	organizations := new(mocks.OrganizationRepository)
	txUsers := new(mocks.UserRepository)
	txOrganizations := new(mocks.OrganizationRepository)
	hasher := new(mocks.PasswordHasher)
	txm := &testTxManager{repos: testTxRepos{orgRepo: txOrganizations, userRepo: txUsers}}
	uc := NewCreateUseCase(users, organizations, txm, hasher, testutil.NewDiscardLogger())

	tenantID := fixtures.NewTestTenantID()
	existingUser := fixtures.NewUser()
	updatedUser := fixtures.NewUser()
	updatedUser.Memberships = []membership.Membership{{
		OrganizationID: tenantID.UUID(),
		Role:           membership.RoleSuperAdmin,
		Status:         membership.StatusInvited,
	}}

	users.On("GetByEmail", mock.Anything, existingUser.Email).Return(existingUser, nil)
	txUsers.On("Update", mock.Anything, mock.Anything).Return(updatedUser, nil)

	result, err := uc.Execute(context.Background(), CreateCommand{
		OrganizationID: tenantID, FirstName: existingUser.FirstName, LastName: existingUser.LastName, Email: existingUser.Email, Password: "password123", Role: "super-admin",
	})

	assert.NoError(t, err)
	assert.NotNil(t, result)
	organizations.AssertNotCalled(t, "GetByDomain")
	hasher.AssertNotCalled(t, "Hash")
	users.AssertNotCalled(t, "Create")
	assert.True(t, txm.called)
}

func TestCreateUseCase_Execute_MembershipAlreadyExists(t *testing.T) {
	users := new(mocks.UserRepository)
	organizations := new(mocks.OrganizationRepository)
	txUsers := new(mocks.UserRepository)
	txOrganizations := new(mocks.OrganizationRepository)
	hasher := new(mocks.PasswordHasher)
	txm := &testTxManager{repos: testTxRepos{orgRepo: txOrganizations, userRepo: txUsers}}
	uc := NewCreateUseCase(users, organizations, txm, hasher, testutil.NewDiscardLogger())

	tenantID := fixtures.NewTestTenantID()
	existingUser := fixtures.NewUserWithMembership()
	existingUser.Memberships[0].OrganizationID = tenantID.UUID()

	users.On("GetByEmail", mock.Anything, existingUser.Email).Return(existingUser, nil)

	result, err := uc.Execute(context.Background(), CreateCommand{
		OrganizationID: tenantID, FirstName: existingUser.FirstName, LastName: existingUser.LastName, Email: existingUser.Email, Password: "password123", Role: "super-admin",
	})

	assert.ErrorIs(t, err, membership.ErrAlreadyExists)
	assert.Nil(t, result)
	assert.True(t, txm.called)
}

func TestCreateUseCase_Execute_InvalidRole(t *testing.T) {
	users := new(mocks.UserRepository)
	organizations := new(mocks.OrganizationRepository)
	hasher := new(mocks.PasswordHasher)
	uc := NewCreateUseCase(users, organizations, nil, hasher, testutil.NewDiscardLogger())

	result, err := uc.Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(), FirstName: "Test", LastName: "User", Email: "test@example.com", Password: "password123", Role: "invalid",
	})

	assert.ErrorIs(t, err, domain.ErrValidation)
	assert.Nil(t, result)
}

func TestCreateUseCase_Execute_EmailDomainOrgNotFound(t *testing.T) {
	users := new(mocks.UserRepository)
	organizations := new(mocks.OrganizationRepository)
	hasher := new(mocks.PasswordHasher)
	uc := NewCreateUseCase(users, organizations, nil, hasher, testutil.NewDiscardLogger())

	users.On("GetByEmail", mock.Anything, "test@unknown.com").Return(nil, usr.ErrNotFound)
	organizations.On("GetByDomain", mock.Anything, "unknown.com").Return(nil, organization.ErrNotFound)

	result, err := uc.Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(), FirstName: "Test", LastName: "User", Email: "test@unknown.com", Password: "password123", Role: "super-admin",
	})

	assert.Error(t, err)
	assert.Nil(t, result)
}

func TestCreateUseCase_Execute_PasswordHashError(t *testing.T) {
	users := new(mocks.UserRepository)
	organizations := new(mocks.OrganizationRepository)
	hasher := new(mocks.PasswordHasher)
	uc := NewCreateUseCase(users, organizations, nil, hasher, testutil.NewDiscardLogger())

	users.On("GetByEmail", mock.Anything, "test@example.com").Return(nil, usr.ErrNotFound)
	organizations.On("GetByDomain", mock.Anything, "example.com").Return(fixtures.NewOrganization(), nil)
	hasher.On("Hash", "password123").Return("", errors.New("hash error"))

	result, err := uc.Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(), FirstName: "Test", LastName: "User", Email: "test@example.com", Password: "password123", Role: "super-admin",
	})

	assert.Error(t, err)
	assert.Nil(t, result)
}

func TestCreateUseCase_Execute_UserCreateError(t *testing.T) {
	users := new(mocks.UserRepository)
	organizations := new(mocks.OrganizationRepository)
	txUsers := new(mocks.UserRepository)
	txOrganizations := new(mocks.OrganizationRepository)
	hasher := new(mocks.PasswordHasher)
	txm := &testTxManager{repos: testTxRepos{orgRepo: txOrganizations, userRepo: txUsers}}
	uc := NewCreateUseCase(users, organizations, txm, hasher, testutil.NewDiscardLogger())

	users.On("GetByEmail", mock.Anything, "test@example.com").Return(nil, usr.ErrNotFound)
	organizations.On("GetByDomain", mock.Anything, "example.com").Return(fixtures.NewOrganization(), nil)
	hasher.On("Hash", "password123").Return("hashed", nil)
	txUsers.On("Create", mock.Anything, mock.Anything).Return(nil, errors.New("db error"))

	result, err := uc.Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(), FirstName: "Test", LastName: "User", Email: "test@example.com", Password: "password123", Role: "super-admin",
	})

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.True(t, txm.called)
}

func TestCreateUseCase_Execute_GetByEmailError(t *testing.T) {
	users := new(mocks.UserRepository)
	organizations := new(mocks.OrganizationRepository)
	hasher := new(mocks.PasswordHasher)
	uc := NewCreateUseCase(users, organizations, nil, hasher, testutil.NewDiscardLogger())

	users.On("GetByEmail", mock.Anything, "test@example.com").Return(nil, errors.New("db error"))

	result, err := uc.Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(), FirstName: "Test", LastName: "User", Email: "test@example.com", Password: "password123", Role: "super-admin",
	})

	assert.Error(t, err)
	assert.Nil(t, result)
}

func TestCreateUseCase_Execute_TransactionError(t *testing.T) {
	users := new(mocks.UserRepository)
	organizations := new(mocks.OrganizationRepository)
	hasher := new(mocks.PasswordHasher)
	txm := &testTxManager{returnErr: errors.New("tx error")}
	uc := NewCreateUseCase(users, organizations, txm, hasher, testutil.NewDiscardLogger())

	users.On("GetByEmail", mock.Anything, "new@example.com").Return(fixtures.NewUserWithEmail("new@example.com"), nil)

	result, err := uc.Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(), FirstName: "New", LastName: "User", Email: "new@example.com", Password: "password123", Role: "super-admin",
	})

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.True(t, txm.called)
}
