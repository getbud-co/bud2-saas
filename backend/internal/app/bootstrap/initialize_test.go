package bootstrap

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	apptx "github.com/getbud-co/bud2/backend/internal/app/tx"
	"github.com/getbud-co/bud2/backend/internal/domain/organization"
	"github.com/getbud-co/bud2/backend/internal/domain/user"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

type mockTxManager struct {
	orgRepo  *mocks.OrganizationRepository
	userRepo *mocks.UserRepository
}

type mockTxRepos struct {
	orgRepo  organization.Repository
	userRepo user.Repository
}

func (m mockTxRepos) Organizations() organization.Repository { return m.orgRepo }
func (m mockTxRepos) Users() user.Repository                 { return m.userRepo }

var _ apptx.Repositories = mockTxRepos{}

func (m *mockTxManager) WithTx(ctx context.Context, fn func(repos apptx.Repositories) error) error {
	return fn(mockTxRepos{orgRepo: m.orgRepo, userRepo: m.userRepo})
}

func newTestCommand() Command {
	return Command{
		OrganizationName:      "Test Org",
		OrganizationDomain:    "example.com",
		OrganizationWorkspace: "example",
		AdminFirstName:        "Admin",
		AdminLastName:         "User",
		AdminEmail:            "admin@example.com",
		AdminPassword:         "password123",
	}
}

func TestUseCase_Execute_Success(t *testing.T) {
	orgRepo := new(mocks.OrganizationRepository)
	txOrgRepo := new(mocks.OrganizationRepository)
	txUserRepo := new(mocks.UserRepository)
	issuer := new(mocks.TokenIssuer)
	hasher := new(mocks.PasswordHasher)
	txm := &mockTxManager{orgRepo: txOrgRepo, userRepo: txUserRepo}

	uc := NewUseCase(orgRepo, txm, issuer, hasher, testutil.NewDiscardLogger())

	createdOrg := fixtures.NewOrganization()
	createdUser := fixtures.NewUserWithMembership()

	orgRepo.On("CountAll", mock.Anything).Return(int64(0), nil)
	hasher.On("Hash", "password123").Return("hashed", nil)
	txOrgRepo.On("Create", mock.Anything, mock.Anything).Return(createdOrg, nil)
	txUserRepo.On("Create", mock.Anything, mock.Anything).Return(createdUser, nil)
	issuer.On("IssueToken", mock.Anything, mock.Anything).Return("test-token", nil)

	result, err := uc.Execute(context.Background(), newTestCommand())

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "test-token", result.AccessToken)
	assert.Equal(t, createdOrg.ID, result.Organization.ID)
	assert.Equal(t, createdUser.ID, result.Admin.ID)
}

func TestUseCase_Execute_AlreadyBootstrapped(t *testing.T) {
	orgRepo := new(mocks.OrganizationRepository)
	uc := NewUseCase(orgRepo, nil, nil, nil, testutil.NewDiscardLogger())

	orgRepo.On("CountAll", mock.Anything).Return(int64(1), nil)

	result, err := uc.Execute(context.Background(), newTestCommand())

	assert.ErrorIs(t, err, ErrAlreadyBootstrapped)
	assert.Nil(t, result)
}

func TestUseCase_Execute_CountError(t *testing.T) {
	orgRepo := new(mocks.OrganizationRepository)
	uc := NewUseCase(orgRepo, nil, nil, nil, testutil.NewDiscardLogger())

	orgRepo.On("CountAll", mock.Anything).Return(int64(0), errors.New("db error"))

	result, err := uc.Execute(context.Background(), newTestCommand())

	assert.Error(t, err)
	assert.Nil(t, result)
}

func TestUseCase_Execute_PasswordHashError(t *testing.T) {
	orgRepo := new(mocks.OrganizationRepository)
	hasher := new(mocks.PasswordHasher)
	uc := NewUseCase(orgRepo, nil, nil, hasher, testutil.NewDiscardLogger())

	orgRepo.On("CountAll", mock.Anything).Return(int64(0), nil)
	hasher.On("Hash", "password123").Return("", errors.New("hash error"))

	result, err := uc.Execute(context.Background(), newTestCommand())

	assert.Error(t, err)
	assert.Nil(t, result)
}

func TestUseCase_Execute_TransactionError(t *testing.T) {
	orgRepo := new(mocks.OrganizationRepository)
	txOrgRepo := new(mocks.OrganizationRepository)
	txUserRepo := new(mocks.UserRepository)
	hasher := new(mocks.PasswordHasher)
	txm := &mockTxManager{orgRepo: txOrgRepo, userRepo: txUserRepo}

	uc := NewUseCase(orgRepo, txm, nil, hasher, testutil.NewDiscardLogger())

	orgRepo.On("CountAll", mock.Anything).Return(int64(0), nil)
	hasher.On("Hash", "password123").Return("hashed", nil)
	txOrgRepo.On("Create", mock.Anything, mock.Anything).Return(nil, errors.New("tx error"))

	result, err := uc.Execute(context.Background(), newTestCommand())

	assert.Error(t, err)
	assert.Nil(t, result)
}

func TestUseCase_Execute_TokenError(t *testing.T) {
	orgRepo := new(mocks.OrganizationRepository)
	txOrgRepo := new(mocks.OrganizationRepository)
	txUserRepo := new(mocks.UserRepository)
	issuer := new(mocks.TokenIssuer)
	hasher := new(mocks.PasswordHasher)
	txm := &mockTxManager{orgRepo: txOrgRepo, userRepo: txUserRepo}

	uc := NewUseCase(orgRepo, txm, issuer, hasher, testutil.NewDiscardLogger())

	orgRepo.On("CountAll", mock.Anything).Return(int64(0), nil)
	hasher.On("Hash", "password123").Return("hashed", nil)
	txOrgRepo.On("Create", mock.Anything, mock.Anything).Return(fixtures.NewOrganization(), nil)
	txUserRepo.On("Create", mock.Anything, mock.Anything).Return(fixtures.NewUserWithMembership(), nil)
	issuer.On("IssueToken", mock.Anything, mock.Anything).Return("", errors.New("token error"))

	result, err := uc.Execute(context.Background(), newTestCommand())

	assert.Error(t, err)
	assert.Nil(t, result)
}

func TestUseCase_Execute_DataCorrectness(t *testing.T) {
	orgRepo := new(mocks.OrganizationRepository)
	txOrgRepo := new(mocks.OrganizationRepository)
	txUserRepo := new(mocks.UserRepository)
	issuer := new(mocks.TokenIssuer)
	hasher := new(mocks.PasswordHasher)
	txm := &mockTxManager{orgRepo: txOrgRepo, userRepo: txUserRepo}

	uc := NewUseCase(orgRepo, txm, issuer, hasher, testutil.NewDiscardLogger())

	orgRepo.On("CountAll", mock.Anything).Return(int64(0), nil)
	hasher.On("Hash", "password123").Return("hashed", nil)

	txOrgRepo.On("Create", mock.Anything, mock.MatchedBy(func(o *organization.Organization) bool {
		return o.Name == "Test Org" && o.Domain == "example.com" && o.Workspace == "example" && o.Status == organization.StatusActive
	})).Return(fixtures.NewOrganization(), nil)

	txUserRepo.On("Create", mock.Anything, mock.MatchedBy(func(u *user.User) bool {
		return u.FirstName == "Admin" && u.LastName == "User" && u.Email == "admin@example.com" && u.PasswordHash == "hashed" && u.Status == user.StatusActive && len(u.Memberships) == 1
	})).Return(fixtures.NewUserWithMembership(), nil)

	issuer.On("IssueToken", mock.Anything, mock.Anything).Return("test-token", nil)

	result, err := uc.Execute(context.Background(), newTestCommand())

	assert.NoError(t, err)
	assert.NotNil(t, result)
	txOrgRepo.AssertExpectations(t)
	txUserRepo.AssertExpectations(t)
}
