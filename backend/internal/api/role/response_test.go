package role

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	roledom "github.com/getbud-co/bud2/backend/internal/domain/role"
)

func TestToResponse_MapsAllFields(t *testing.T) {
	id := uuid.New()
	description := "Lidera projetos"
	createdAt := time.Date(2026, 4, 24, 10, 11, 12, 0, time.UTC)
	updatedAt := time.Date(2026, 4, 24, 13, 14, 15, 0, time.UTC)

	got := toResponse(roledom.Role{
		ID:            id,
		Slug:          "lider-projeto",
		Name:          "Lider de projeto",
		Description:   &description,
		Type:          roledom.TypeCustom,
		Scope:         roledom.ScopeTeam,
		IsDefault:     true,
		PermissionIDs: []string{"people.view", "missions.assign"},
		UsersCount:    3,
		CreatedAt:     createdAt,
		UpdatedAt:     updatedAt,
	})

	assert.Equal(t, id.String(), got.ID)
	assert.Equal(t, "lider-projeto", got.Slug)
	assert.Equal(t, "Lider de projeto", got.Name)
	require.NotNil(t, got.Description)
	assert.Equal(t, description, *got.Description)
	assert.Equal(t, "custom", got.Type)
	assert.Equal(t, "team", got.Scope)
	assert.True(t, got.IsDefault)
	assert.Equal(t, []string{"people.view", "missions.assign"}, got.PermissionIDs)
	assert.Equal(t, 3, got.UsersCount)
	assert.Equal(t, createdAt.Format(time.RFC3339), got.CreatedAt)
	assert.Equal(t, updatedAt.Format(time.RFC3339), got.UpdatedAt)
}

func TestToResponse_NilDescriptionRemainsNilAndNilPermissionIDsBecomeEmptyArray(t *testing.T) {
	got := toResponse(roledom.Role{
		ID:            uuid.New(),
		Slug:          "custom",
		Name:          "Custom",
		Description:   nil,
		Type:          roledom.TypeCustom,
		Scope:         roledom.ScopeSelf,
		PermissionIDs: nil,
		CreatedAt:     time.Now().UTC(),
		UpdatedAt:     time.Now().UTC(),
	})

	assert.Nil(t, got.Description)
	assert.NotNil(t, got.PermissionIDs)
	assert.Empty(t, got.PermissionIDs)
}

func TestToListResponse_PreservesOrderAndSize(t *testing.T) {
	now := time.Now().UTC()
	roles := []roledom.Role{
		{ID: uuid.New(), Slug: "first", Name: "First", Type: roledom.TypeCustom, Scope: roledom.ScopeSelf, CreatedAt: now, UpdatedAt: now},
		{ID: uuid.New(), Slug: "second", Name: "Second", Type: roledom.TypeCustom, Scope: roledom.ScopeTeam, CreatedAt: now, UpdatedAt: now},
	}

	got := toListResponse(roles)

	require.Len(t, got.Data, 2)
	assert.Equal(t, "first", got.Data[0].Slug)
	assert.Equal(t, "second", got.Data[1].Slug)
}
