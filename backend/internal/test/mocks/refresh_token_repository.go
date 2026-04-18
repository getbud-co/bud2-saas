package mocks

import (
	"context"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"

	domainauth "github.com/getbud-co/bud2/backend/internal/domain/auth"
)

// RefreshTokenRepository is a mock implementation of domain/auth.RefreshTokenRepository.
type RefreshTokenRepository struct {
	mock.Mock
}

func (m *RefreshTokenRepository) Create(ctx context.Context, token *domainauth.RefreshToken) (*domainauth.RefreshToken, error) {
	args := m.Called(ctx, token)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domainauth.RefreshToken), args.Error(1)
}

func (m *RefreshTokenRepository) GetByTokenHash(ctx context.Context, tokenHash string) (*domainauth.RefreshToken, error) {
	args := m.Called(ctx, tokenHash)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domainauth.RefreshToken), args.Error(1)
}

func (m *RefreshTokenRepository) RevokeByID(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *RefreshTokenRepository) RevokeAllByUserID(ctx context.Context, userID uuid.UUID) error {
	args := m.Called(ctx, userID)
	return args.Error(0)
}
