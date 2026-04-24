package postgres

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/getbud-co/bud2/backend/internal/domain/organization"
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
		string(organization.MembershipRoleGestor),
		string(organization.MembershipStatusInactive),
		pgtype.UUID{Bytes: invitedBy, Valid: true},
		pgtype.Timestamptz{Time: joinedAt, Valid: true},
		now,
		now,
	)

	require.NotNil(t, result.InvitedByUserID)
	require.NotNil(t, result.JoinedAt)
	assert.Equal(t, invitedBy, *result.InvitedByUserID)
	assert.Equal(t, joinedAt, *result.JoinedAt)
	assert.Equal(t, organization.MembershipRoleGestor, result.Role)
	assert.Equal(t, organization.MembershipStatusInactive, result.Status)
}

func TestUserRowMappers_MapOptionalFieldsAndMembershipScope(t *testing.T) {
	now := time.Now().UTC()
	birthDate := time.Date(1990, 2, 3, 0, 0, 0, 0, time.UTC)
	nickname := pgtype.Text{String: "tester", Valid: true}
	jobTitle := pgtype.Text{String: "Engineer", Valid: true}
	birth := pgtype.Date{Time: birthDate, Valid: true}
	gender := pgtype.Text{String: "non-binary", Valid: true}
	phone := pgtype.Text{String: "+5511999999999", Valid: true}
	orgID := uuid.New()
	userID := uuid.New()

	byID := getUserByIDRowToDomain(sqlc.GetUserByIDRow{
		ID: userID, FirstName: "Ada", LastName: "Lovelace", Email: "ada@example.com", PasswordHash: "hash",
		Status: string(user.StatusActive), IsSystemAdmin: true, Nickname: nickname, JobTitle: jobTitle,
		BirthDate: birth, Language: "en", Gender: gender, Phone: phone, CreatedAt: now, UpdatedAt: now,
	})
	assert.Equal(t, userID, byID.ID)
	assert.Equal(t, user.StatusActive, byID.Status)
	assert.True(t, byID.IsSystemAdmin)
	assert.Equal(t, "tester", *byID.Nickname)
	assert.Equal(t, birthDate, *byID.BirthDate)
	assert.Equal(t, "+5511999999999", *byID.Phone)

	byEmail := getUserByEmailRowToDomain(sqlc.GetUserByEmailRow{
		ID: userID, FirstName: "Ada", LastName: "Lovelace", Email: "ada@example.com", PasswordHash: "hash",
		Status: string(user.StatusInactive), IsSystemAdmin: false, Language: "pt-br", CreatedAt: now, UpdatedAt: now,
	})
	assert.Equal(t, user.StatusInactive, byEmail.Status)

	listed := listOrganizationUsersRowToDomain(sqlc.ListOrganizationUsersRow{
		ID: userID, FirstName: "Ada", LastName: "Lovelace", Email: "ada@example.com", PasswordHash: "hash",
		Status: string(user.StatusActive), IsSystemAdmin: false, Language: "en", CreatedAt: now, UpdatedAt: now,
		MembershipRole: string(organization.MembershipRoleGestor), MembershipStatus: string(organization.MembershipStatusActive),
	}, orgID)
	assert.Len(t, listed.Memberships, 1)
	assert.Equal(t, orgID, listed.Memberships[0].OrganizationID)
	assert.Equal(t, organization.MembershipRoleGestor, listed.Memberships[0].Role)

	listedByStatus := listOrganizationUsersByStatusRowToDomain(sqlc.ListOrganizationUsersByStatusRow{
		ID: userID, FirstName: "Ada", LastName: "Lovelace", Email: "ada@example.com", PasswordHash: "hash",
		Status: string(user.StatusActive), IsSystemAdmin: false, Language: "en", CreatedAt: now, UpdatedAt: now,
		MembershipRole: string(organization.MembershipRoleColaborador), MembershipStatus: string(organization.MembershipStatusInactive),
	}, orgID)
	assert.Equal(t, organization.MembershipRoleColaborador, listedByStatus.Memberships[0].Role)
	assert.Equal(t, organization.MembershipStatusInactive, listedByStatus.Memberships[0].Status)

	updated := updateUserRowToDomain(sqlc.UpdateUserRow{
		ID: userID, FirstName: "Grace", LastName: "Hopper", Email: "grace@example.com", PasswordHash: "hash",
		Status: string(user.StatusActive), IsSystemAdmin: false, Language: "en", CreatedAt: now, UpdatedAt: now.Add(time.Hour),
	})
	assert.Equal(t, "Grace", updated.FirstName)
	assert.Equal(t, now.Add(time.Hour), updated.UpdatedAt)
}

func TestPgtypeHelpers_MapNilAndValues(t *testing.T) {
	value := "hello"
	now := time.Now().UTC()

	assert.False(t, textToPgtype(nil).Valid)
	assert.Equal(t, pgtype.Text{String: value, Valid: true}, textToPgtype(&value))
	assert.Nil(t, pgtypeToText(pgtype.Text{}))
	assert.Equal(t, value, *pgtypeToText(pgtype.Text{String: value, Valid: true}))

	assert.False(t, timeToPgtypeDate(nil).Valid)
	assert.Equal(t, now, timeToPgtypeDate(&now).Time)
	assert.Nil(t, pgtypeDateToTime(pgtype.Date{}))
	assert.Equal(t, now, *pgtypeDateToTime(pgtype.Date{Time: now, Valid: true}))
}
