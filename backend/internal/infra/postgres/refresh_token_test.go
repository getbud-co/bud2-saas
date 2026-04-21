package postgres

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	domainauth "github.com/getbud-co/bud2/backend/internal/domain/auth"
	"github.com/getbud-co/bud2/backend/internal/infra/postgres/sqlc"
)

type stubRefreshTokenQuerier struct {
	createArg sqlc.CreateRefreshTokenParams
	createRow sqlc.CreateRefreshTokenRow
	createErr error
	getArg    string
	getRow    sqlc.GetRefreshTokenByTokenHashRow
	getErr    error
}

func (s *stubRefreshTokenQuerier) CreateRefreshToken(ctx context.Context, arg sqlc.CreateRefreshTokenParams) (sqlc.CreateRefreshTokenRow, error) {
	s.createArg = arg
	return s.createRow, s.createErr
}

func (s *stubRefreshTokenQuerier) GetRefreshTokenByTokenHash(ctx context.Context, tokenHash string) (sqlc.GetRefreshTokenByTokenHashRow, error) {
	s.getArg = tokenHash
	return s.getRow, s.getErr
}

func (s *stubRefreshTokenQuerier) RevokeRefreshToken(ctx context.Context, id uuid.UUID) error {
	return nil
}

func (s *stubRefreshTokenQuerier) RevokeAllRefreshTokensByUserID(ctx context.Context, userID uuid.UUID) error {
	return nil
}

func TestRefreshTokenRepository_Create_PassesActiveOrganizationAndMapsResult(t *testing.T) {
	userID := uuid.New()
	orgID := uuid.New()
	expiresAt := time.Now().Add(time.Hour)
	querier := &stubRefreshTokenQuerier{}
	repo := NewRefreshTokenRepository(querier)
	querier.createRow = sqlc.CreateRefreshTokenRow{
		ID:                   uuid.New(),
		UserID:               userID,
		ActiveOrganizationID: pgtype.UUID{Bytes: orgID, Valid: true},
		TokenHash:            "hashed-token",
		ExpiresAt:            expiresAt,
		CreatedAt:            time.Now(),
	}

	result, err := repo.Create(context.Background(), &domainauth.RefreshToken{
		ID:                   querier.createRow.ID,
		UserID:               userID,
		ActiveOrganizationID: &orgID,
		TokenHash:            "hashed-token",
		ExpiresAt:            expiresAt,
	})

	require.NoError(t, err)
	assert.True(t, querier.createArg.ActiveOrganizationID.Valid)
	assert.Equal(t, orgID, uuid.UUID(querier.createArg.ActiveOrganizationID.Bytes))
	require.NotNil(t, result.ActiveOrganizationID)
	assert.Equal(t, orgID, *result.ActiveOrganizationID)
}

func TestRefreshTokenRepository_GetByTokenHash_TranslatesNotFound(t *testing.T) {
	querier := &stubRefreshTokenQuerier{getErr: pgx.ErrNoRows}
	repo := NewRefreshTokenRepository(querier)

	result, err := repo.GetByTokenHash(context.Background(), "missing")

	assert.ErrorIs(t, err, domainauth.ErrRefreshTokenNotFound)
	assert.Nil(t, result)
	assert.Equal(t, "missing", querier.getArg)
}
