package postgres

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"

	"github.com/getbud-co/bud2/backend/internal/domain/organization"
	"github.com/getbud-co/bud2/backend/internal/infra/postgres/sqlc"
)

func TestGetOrganizationByIDForUserRowToDomain_MapsFields(t *testing.T) {
	now := time.Now().UTC()
	row := sqlc.GetOrganizationByIDForUserRow{
		ID:        uuid.New(),
		Name:      "Alpha",
		Domain:    "alpha.example.com",
		Workspace: "alpha",
		Status:    string(organization.StatusActive),
		CreatedAt: now,
		UpdatedAt: now,
	}

	result := getOrganizationByIDForUserRowToDomain(row)

	assert.Equal(t, row.ID, result.ID)
	assert.Equal(t, row.Domain, result.Domain)
	assert.Equal(t, organization.StatusActive, result.Status)
	assert.Equal(t, now, result.CreatedAt)
}

func TestListOrganizationsByUserAndStatusRowToDomain_MapsFields(t *testing.T) {
	now := time.Now().UTC()
	row := sqlc.ListOrganizationsByUserAndStatusRow{
		ID:        uuid.New(),
		Name:      "Beta",
		Domain:    "beta.example.com",
		Workspace: "beta",
		Status:    string(organization.StatusInactive),
		CreatedAt: now,
		UpdatedAt: now,
	}

	result := listOrganizationsByUserAndStatusRowToDomain(row)

	assert.Equal(t, row.ID, result.ID)
	assert.Equal(t, row.Workspace, result.Workspace)
	assert.Equal(t, organization.StatusInactive, result.Status)
	assert.Equal(t, now, result.UpdatedAt)
}
