package postgres

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/getbud-co/bud2/backend/internal/domain/role"
	"github.com/getbud-co/bud2/backend/internal/infra/postgres/sqlc"
)

type fakeRoleQuerier struct {
	rows []sqlc.ListRolesRow
	err  error
}

func (f fakeRoleQuerier) ListRoles(context.Context, uuid.UUID) ([]sqlc.ListRolesRow, error) {
	if f.err != nil {
		return nil, f.err
	}
	return f.rows, nil
}

func TestRoleRepository_List_MapsRowsToDomainRoles(t *testing.T) {
	now := time.Now().UTC()
	rows := []sqlc.ListRolesRow{
		{
			ID:          uuid.New(),
			Slug:        "super-admin",
			Name:        "Super Admin",
			Description: pgtype.Text{String: "Acesso total", Valid: true},
			Type:        "system",
			Scope:       "org",
			IsDefault:   false,
			UsersCount:  2,
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		{
			ID:          uuid.New(),
			Slug:        "lider-projeto",
			Name:        "Lider de projeto",
			Description: pgtype.Text{Valid: false},
			Type:        "custom",
			Scope:       "team",
			IsDefault:   false,
			CreatedAt:   now.Add(time.Minute),
			UpdatedAt:   now.Add(time.Minute),
		},
	}
	repo := NewRoleRepository(fakeRoleQuerier{rows: rows})

	got, err := repo.List(context.Background(), uuid.New())

	require.NoError(t, err)
	require.Len(t, got, 2)
	assert.Equal(t, "super-admin", got[0].Slug)
	assert.Equal(t, role.TypeSystem, got[0].Type)
	assert.Equal(t, role.ScopeOrg, got[0].Scope)
	assert.Equal(t, 2, got[0].UsersCount)
	assert.Equal(t, "lider-projeto", got[1].Slug)
	assert.Equal(t, role.TypeCustom, got[1].Type)
	assert.Equal(t, role.ScopeTeam, got[1].Scope)
	assert.Nil(t, got[1].Description)
}

func TestRoleRepository_List_PropagatesQueryError(t *testing.T) {
	queryErr := errors.New("query failed")
	repo := NewRoleRepository(fakeRoleQuerier{err: queryErr})

	_, err := repo.List(context.Background(), uuid.New())

	assert.ErrorIs(t, err, queryErr)
}

func TestRoleRowToDomain_MapsFields(t *testing.T) {
	now := time.Now().UTC()
	id := uuid.New()
	row := sqlc.ListRolesRow{
		ID:          id,
		Slug:        "super-admin",
		Name:        "Super Admin",
		Description: pgtype.Text{String: "Acesso total", Valid: true},
		Type:        "system",
		Scope:       "org",
		IsDefault:   false,
		UsersCount:  7,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	got := roleRowToDomain(row)

	assert.Equal(t, id, got.ID)
	assert.Equal(t, "super-admin", got.Slug)
	assert.Equal(t, "Super Admin", got.Name)
	require.NotNil(t, got.Description)
	assert.Equal(t, "Acesso total", *got.Description)
	assert.Equal(t, role.TypeSystem, got.Type)
	assert.Equal(t, role.ScopeOrg, got.Scope)
	assert.False(t, got.IsDefault)
	assert.Equal(t, 7, got.UsersCount)
	assert.Equal(t, now, got.CreatedAt)
	assert.Equal(t, now, got.UpdatedAt)
}

func TestRoleRowToDomain_NullDescriptionMapsToNil(t *testing.T) {
	row := sqlc.ListRolesRow{
		ID:          uuid.New(),
		Slug:        "colaborador",
		Name:        "Colaborador",
		Description: pgtype.Text{Valid: false},
		Type:        "system",
		Scope:       "self",
		IsDefault:   true,
	}

	got := roleRowToDomain(row)

	assert.Nil(t, got.Description)
	assert.True(t, got.IsDefault)
}
