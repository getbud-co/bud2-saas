package auth

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
)

// RefreshToken represents a stored refresh token record.
type RefreshToken struct {
	ID        uuid.UUID
	UserID    uuid.UUID
	TokenHash string
	ExpiresAt time.Time
	RevokedAt *time.Time
	CreatedAt time.Time
}

// RefreshTokenRepository defines persistence operations for refresh tokens.
type RefreshTokenRepository interface {
	Create(ctx context.Context, token *RefreshToken) (*RefreshToken, error)
	GetByTokenHash(ctx context.Context, tokenHash string) (*RefreshToken, error)
	RevokeByID(ctx context.Context, id uuid.UUID) error
	RevokeAllByUserID(ctx context.Context, userID uuid.UUID) error
}

// TokenHasher defines one-way hashing for opaque tokens (e.g. SHA-256).
// Unlike PasswordHasher, no verification — the caller re-hashes and compares.
type TokenHasher interface {
	Hash(token string) string
}

var (
	ErrRefreshTokenNotFound = errors.New("refresh token not found")
	ErrRefreshTokenRevoked  = errors.New("refresh token has been revoked")
	ErrRefreshTokenExpired  = errors.New("refresh token has expired")
)
