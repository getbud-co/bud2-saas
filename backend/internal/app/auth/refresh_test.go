package auth

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	domainauth "github.com/getbud-co/bud2/backend/internal/domain/auth"
	"github.com/getbud-co/bud2/backend/internal/domain/user"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func newRefreshUseCase(
	users *mocks.UserRepository,
	organizations *mocks.OrganizationRepository,
	issuer *mocks.TokenIssuer,
	hasher *mocks.PasswordHasher,
	rtRepo *mocks.RefreshTokenRepository,
	tokenHasher *mocks.TokenHasher,
) *RefreshUseCase {
	return NewRefreshUseCase(
		users, organizations,
		issuer, hasher,
		rtRepo, tokenHasher,
		testutil.NewDiscardLogger(),
	)
}

func newRefreshToken(userID uuid.UUID, expiresAt time.Time) *domainauth.RefreshToken {
	return &domainauth.RefreshToken{
		ID:        uuid.New(),
		UserID:    userID,
		TokenHash: "hash-abc",
		ExpiresAt: expiresAt,
		CreatedAt: time.Now(),
	}
}

func setupSessionMocks(users *mocks.UserRepository, organizations *mocks.OrganizationRepository, u *user.User) {
	users.On("GetByID", mock.Anything, u.ID).Return(u, nil)
	organizations.On("GetByID", mock.Anything, mock.Anything).Return(fixtures.NewOrganization(), nil)
}

func TestRefreshUseCase_Execute_Success(t *testing.T) {
	users := new(mocks.UserRepository)
	organizations := new(mocks.OrganizationRepository)
	issuer := new(mocks.TokenIssuer)
	hasher := new(mocks.PasswordHasher)
	rtRepo := new(mocks.RefreshTokenRepository)
	tokenHasher := new(mocks.TokenHasher)
	uc := newRefreshUseCase(users, organizations, issuer, hasher, rtRepo, tokenHasher)

	u := fixtures.NewUserWithMembership()
	stored := newRefreshToken(u.ID, time.Now().Add(7*24*time.Hour))

	tokenHasher.On("Hash", "raw-token").Return("hash-abc")
	rtRepo.On("GetByTokenHash", mock.Anything, "hash-abc").Return(stored, nil)
	rtRepo.On("RevokeByID", mock.Anything, stored.ID).Return(nil)
	setupSessionMocks(users, organizations, u)
	issuer.On("IssueToken", mock.Anything, mock.Anything).Return("new-access-token", nil)
	rtRepo.On("Create", mock.Anything, mock.Anything).Return(&domainauth.RefreshToken{
		ID: uuid.New(), UserID: u.ID, TokenHash: "new-hash", ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
	}, nil)
	tokenHasher.On("Hash", mock.AnythingOfType("string")).Return("new-hash").Maybe()

	result, err := uc.Execute(context.Background(), RefreshCommand{RawToken: "raw-token"})

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "new-access-token", result.Token)
	assert.NotEmpty(t, result.RefreshToken)
	rtRepo.AssertCalled(t, "RevokeByID", mock.Anything, stored.ID)
}

func TestRefreshUseCase_Execute_TokenNotFound(t *testing.T) {
	rtRepo := new(mocks.RefreshTokenRepository)
	tokenHasher := new(mocks.TokenHasher)
	uc := newRefreshUseCase(
		new(mocks.UserRepository), new(mocks.OrganizationRepository),
		new(mocks.TokenIssuer), new(mocks.PasswordHasher), rtRepo, tokenHasher,
	)

	tokenHasher.On("Hash", "bad-token").Return("unknown-hash")
	rtRepo.On("GetByTokenHash", mock.Anything, "unknown-hash").Return(nil, domainauth.ErrRefreshTokenNotFound)

	result, err := uc.Execute(context.Background(), RefreshCommand{RawToken: "bad-token"})

	assert.ErrorIs(t, err, domainauth.ErrRefreshTokenNotFound)
	assert.Nil(t, result)
}

func TestRefreshUseCase_Execute_TokenRevoked_RevokeAll(t *testing.T) {
	users := new(mocks.UserRepository)
	rtRepo := new(mocks.RefreshTokenRepository)
	tokenHasher := new(mocks.TokenHasher)
	uc := newRefreshUseCase(
		users, new(mocks.OrganizationRepository),
		new(mocks.TokenIssuer), new(mocks.PasswordHasher), rtRepo, tokenHasher,
	)

	now := time.Now()
	stored := newRefreshToken(uuid.New(), time.Now().Add(7*24*time.Hour))
	stored.RevokedAt = &now

	tokenHasher.On("Hash", "revoked-token").Return("hash-revoked")
	rtRepo.On("GetByTokenHash", mock.Anything, "hash-revoked").Return(stored, nil)
	rtRepo.On("RevokeAllByUserID", mock.Anything, stored.UserID).Return(nil)

	result, err := uc.Execute(context.Background(), RefreshCommand{RawToken: "revoked-token"})

	assert.ErrorIs(t, err, domainauth.ErrRefreshTokenRevoked)
	assert.Nil(t, result)
	rtRepo.AssertCalled(t, "RevokeAllByUserID", mock.Anything, stored.UserID)
}

func TestRefreshUseCase_Execute_TokenExpired(t *testing.T) {
	rtRepo := new(mocks.RefreshTokenRepository)
	tokenHasher := new(mocks.TokenHasher)
	uc := newRefreshUseCase(
		new(mocks.UserRepository), new(mocks.OrganizationRepository),
		new(mocks.TokenIssuer), new(mocks.PasswordHasher), rtRepo, tokenHasher,
	)

	stored := newRefreshToken(uuid.New(), time.Now().Add(-1*time.Hour)) // already expired

	tokenHasher.On("Hash", "expired-token").Return("hash-expired")
	rtRepo.On("GetByTokenHash", mock.Anything, "hash-expired").Return(stored, nil)

	result, err := uc.Execute(context.Background(), RefreshCommand{RawToken: "expired-token"})

	assert.ErrorIs(t, err, domainauth.ErrRefreshTokenExpired)
	assert.Nil(t, result)
}

func TestRefreshUseCase_Execute_InactiveUser(t *testing.T) {
	users := new(mocks.UserRepository)
	rtRepo := new(mocks.RefreshTokenRepository)
	tokenHasher := new(mocks.TokenHasher)
	uc := newRefreshUseCase(
		users, new(mocks.OrganizationRepository),
		new(mocks.TokenIssuer), new(mocks.PasswordHasher), rtRepo, tokenHasher,
	)

	inactiveUser := fixtures.NewInactiveUser()
	stored := newRefreshToken(inactiveUser.ID, time.Now().Add(7*24*time.Hour))

	tokenHasher.On("Hash", "some-token").Return("hash-inactive")
	rtRepo.On("GetByTokenHash", mock.Anything, "hash-inactive").Return(stored, nil)
	rtRepo.On("RevokeByID", mock.Anything, stored.ID).Return(nil)
	users.On("GetByID", mock.Anything, inactiveUser.ID).Return(inactiveUser, nil)

	result, err := uc.Execute(context.Background(), RefreshCommand{RawToken: "some-token"})

	assert.ErrorIs(t, err, ErrUserInactive)
	assert.Nil(t, result)
}
