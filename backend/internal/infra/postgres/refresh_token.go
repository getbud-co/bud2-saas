package postgres

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	domainauth "github.com/getbud-co/bud2/backend/internal/domain/auth"
	"github.com/getbud-co/bud2/backend/internal/infra/postgres/sqlc"
)

type refreshTokenQuerier interface {
	CreateRefreshToken(ctx context.Context, arg sqlc.CreateRefreshTokenParams) (sqlc.RefreshToken, error)
	GetRefreshTokenByTokenHash(ctx context.Context, tokenHash string) (sqlc.RefreshToken, error)
	RevokeRefreshToken(ctx context.Context, id uuid.UUID) error
	RevokeAllRefreshTokensByUserID(ctx context.Context, userID uuid.UUID) error
}

type RefreshTokenRepository struct {
	q refreshTokenQuerier
}

func NewRefreshTokenRepository(q refreshTokenQuerier) *RefreshTokenRepository {
	return &RefreshTokenRepository{q: q}
}

func (r *RefreshTokenRepository) Create(ctx context.Context, token *domainauth.RefreshToken) (*domainauth.RefreshToken, error) {
	row, err := r.q.CreateRefreshToken(ctx, sqlc.CreateRefreshTokenParams{
		ID:        token.ID,
		UserID:    token.UserID,
		TokenHash: token.TokenHash,
		ExpiresAt: token.ExpiresAt,
	})
	if err != nil {
		return nil, err
	}
	return refreshTokenRowToDomain(row), nil
}

func (r *RefreshTokenRepository) GetByTokenHash(ctx context.Context, tokenHash string) (*domainauth.RefreshToken, error) {
	row, err := r.q.GetRefreshTokenByTokenHash(ctx, tokenHash)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainauth.ErrRefreshTokenNotFound
		}
		return nil, err
	}
	return refreshTokenRowToDomain(row), nil
}

func (r *RefreshTokenRepository) RevokeByID(ctx context.Context, id uuid.UUID) error {
	return r.q.RevokeRefreshToken(ctx, id)
}

func (r *RefreshTokenRepository) RevokeAllByUserID(ctx context.Context, userID uuid.UUID) error {
	return r.q.RevokeAllRefreshTokensByUserID(ctx, userID)
}

func refreshTokenRowToDomain(row sqlc.RefreshToken) *domainauth.RefreshToken {
	t := &domainauth.RefreshToken{
		ID:        row.ID,
		UserID:    row.UserID,
		TokenHash: row.TokenHash,
		ExpiresAt: row.ExpiresAt,
		CreatedAt: row.CreatedAt,
	}
	if row.RevokedAt.Valid {
		ts := row.RevokedAt.Time.UTC()
		t.RevokedAt = &ts
	}
	return t
}

// Ensure *RefreshTokenRepository satisfies the domain interface at compile time.
var _ domainauth.RefreshTokenRepository = (*RefreshTokenRepository)(nil)
