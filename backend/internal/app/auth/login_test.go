package auth

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	domainauth "github.com/getbud-co/bud2/backend/internal/domain/auth"
	"github.com/getbud-co/bud2/backend/internal/domain/organization"
	"github.com/getbud-co/bud2/backend/internal/domain/user"
	infraauth "github.com/getbud-co/bud2/backend/internal/infra/auth"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

// newLoginUC is a helper to construct LoginUseCase with the standard test dependencies.
func newLoginUC(
	users *mocks.UserRepository,
	organizations *mocks.OrganizationRepository,
	rtRepo *mocks.RefreshTokenRepository,
	tokenHasher *mocks.TokenHasher,
) *LoginUseCase {
	return NewLoginUseCase(
		users, organizations,
		infraauth.NewTokenIssuer("test-secret"),
		infraauth.NewDefaultBcryptPasswordHasher(),
		rtRepo, tokenHasher,
		testutil.NewDiscardLogger(),
		8*time.Hour, 7*24*time.Hour,
	)
}

// setupRefreshTokenMocks sets up the mocks needed for refresh token issuance.
func setupRefreshTokenMocks(rtRepo *mocks.RefreshTokenRepository, tokenHasher *mocks.TokenHasher, userID uuid.UUID) {
	tokenHasher.On("Hash", mock.AnythingOfType("string")).Return("hashed-raw-token")
	rtRepo.On("Create", mock.Anything, mock.MatchedBy(func(t *domainauth.RefreshToken) bool {
		return t.UserID == userID
	})).Return(&domainauth.RefreshToken{
		ID:        uuid.New(),
		UserID:    userID,
		TokenHash: "hashed-raw-token",
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
	}, nil)
}

func TestLoginUseCase_Execute_Success(t *testing.T) {
	users := new(mocks.UserRepository)
	organizations := new(mocks.OrganizationRepository)
	rtRepo := new(mocks.RefreshTokenRepository)
	tokenHasher := new(mocks.TokenHasher)

	passwordHasher := infraauth.NewDefaultBcryptPasswordHasher()
	hash, _ := passwordHasher.Hash("password123")
	testUser := fixtures.NewUserWithMembership()
	testUser.PasswordHash = hash
	testUser.Email = "admin@example.com"
	testOrg := &organization.Organization{ID: uuid.New(), Name: "Example", Domain: "example.com", Workspace: "example", Status: organization.StatusActive}
	testUser.Memberships[0].OrganizationID = testOrg.ID

	uc := newLoginUC(users, organizations, rtRepo, tokenHasher)

	users.On("GetByEmail", mock.Anything, testUser.Email).Return(testUser, nil)
	users.On("ActivateInvitedMemberships", mock.Anything, testUser.ID).Return(nil)
	organizations.On("GetByID", mock.Anything, testOrg.ID).Return(testOrg, nil)
	setupRefreshTokenMocks(rtRepo, tokenHasher, testUser.ID)

	result, err := uc.Execute(context.Background(), LoginCommand{Email: testUser.Email, Password: "password123"})

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.NotEmpty(t, result.Token)
	assert.NotEmpty(t, result.RefreshToken)
	assert.Equal(t, testOrg.ID, result.Session.ActiveOrganization.ID)
	assert.Empty(t, result.Session.User.PasswordHash)
}

func TestLoginUseCase_Execute_UserNotFound(t *testing.T) {
	users := new(mocks.UserRepository)
	uc := newLoginUC(users, new(mocks.OrganizationRepository), new(mocks.RefreshTokenRepository), new(mocks.TokenHasher))
	users.On("GetByEmail", mock.Anything, "missing@example.com").Return(nil, user.ErrNotFound)

	result, err := uc.Execute(context.Background(), LoginCommand{Email: "missing@example.com", Password: "password123"})
	assert.ErrorIs(t, err, ErrInvalidCredentials)
	assert.Nil(t, result)
}

func TestLoginUseCase_Execute_NoOrganizations(t *testing.T) {
	users := new(mocks.UserRepository)
	passwordHasher := infraauth.NewDefaultBcryptPasswordHasher()
	hash, _ := passwordHasher.Hash("password123")
	testUser := &user.User{ID: uuid.New(), FirstName: "Admin", LastName: "User", Email: "admin@example.com", PasswordHash: hash, Status: user.StatusActive}

	uc := newLoginUC(users, new(mocks.OrganizationRepository), new(mocks.RefreshTokenRepository), new(mocks.TokenHasher))
	users.On("GetByEmail", mock.Anything, testUser.Email).Return(testUser, nil)
	users.On("ActivateInvitedMemberships", mock.Anything, testUser.ID).Return(nil)

	result, err := uc.Execute(context.Background(), LoginCommand{Email: testUser.Email, Password: "password123"})
	assert.ErrorIs(t, err, ErrNoOrganizations)
	assert.Nil(t, result)
}

func TestLoginUseCase_Execute_RepositoryError(t *testing.T) {
	users := new(mocks.UserRepository)
	uc := newLoginUC(users, new(mocks.OrganizationRepository), new(mocks.RefreshTokenRepository), new(mocks.TokenHasher))
	users.On("GetByEmail", mock.Anything, "admin@example.com").Return(nil, errors.New("db error"))

	result, err := uc.Execute(context.Background(), LoginCommand{Email: "admin@example.com", Password: "password123"})
	assert.Error(t, err)
	assert.Nil(t, result)
}

func TestLoginUseCase_Execute_ActivateInvitedMembershipsError(t *testing.T) {
	users := new(mocks.UserRepository)
	passwordHasher := infraauth.NewDefaultBcryptPasswordHasher()
	hash, _ := passwordHasher.Hash("password123")
	testUser := fixtures.NewUserWithMembership()
	testUser.PasswordHash = hash
	testUser.Email = "admin@example.com"

	uc := newLoginUC(users, new(mocks.OrganizationRepository), new(mocks.RefreshTokenRepository), new(mocks.TokenHasher))
	users.On("GetByEmail", mock.Anything, testUser.Email).Return(testUser, nil)
	users.On("ActivateInvitedMemberships", mock.Anything, testUser.ID).Return(errors.New("db error"))

	result, err := uc.Execute(context.Background(), LoginCommand{Email: testUser.Email, Password: "password123"})
	assert.Error(t, err)
	assert.Nil(t, result)
}
