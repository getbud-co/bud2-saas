package postgres

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/getbud-co/bud2/backend/internal/domain/membership"
	"github.com/getbud-co/bud2/backend/internal/domain/user"
	"github.com/getbud-co/bud2/backend/internal/infra/postgres/sqlc"
)

func TestCreateUserRowToDomain_MapsFields(t *testing.T) {
	now := time.Now().UTC()
	row := sqlc.CreateUserRow{
		ID:            uuid.New(),
		FirstName:     "Test",
		LastName:      "User",
		Email:         "user@example.com",
		PasswordHash:  "hashed",
		Status:        string(user.StatusActive),
		IsSystemAdmin: true,
		Language:      "pt-br",
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	result := createUserRowToDomain(row)

	assert.Equal(t, row.ID, result.ID)
	assert.Equal(t, "Test", result.FirstName)
	assert.Equal(t, "User", result.LastName)
	assert.Equal(t, row.Email, result.Email)
	assert.Equal(t, user.StatusActive, result.Status)
	assert.True(t, result.IsSystemAdmin)
	assert.Equal(t, now, result.CreatedAt)
}

func TestMembershipRowToDomain_MapsOptionalFields(t *testing.T) {
	now := time.Now().UTC()
	invitedBy := uuid.New()
	joinedAt := now.Add(-time.Hour)

	result := membershipRowToDomain(
		uuid.New(),
		uuid.New(),
		uuid.New(),
		string(membership.RoleGestor),
		string(membership.StatusInactive),
		pgtype.UUID{Bytes: invitedBy, Valid: true},
		pgtype.Timestamptz{Time: joinedAt, Valid: true},
		now,
		now,
	)

	require.NotNil(t, result.InvitedByUserID)
	require.NotNil(t, result.JoinedAt)
	assert.Equal(t, invitedBy, *result.InvitedByUserID)
	assert.Equal(t, joinedAt, *result.JoinedAt)
	assert.Equal(t, membership.RoleGestor, result.Role)
	assert.Equal(t, membership.StatusInactive, result.Status)
}
