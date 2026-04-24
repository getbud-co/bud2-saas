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

func TestOrganizationRowMappers_MapCommonFields(t *testing.T) {
	now := time.Now().UTC()
	id := uuid.New()

	assert.Equal(t, id, createOrganizationRowToDomain(sqlc.CreateOrganizationRow{
		ID: id, Name: "Create", Domain: "create.example.com", Workspace: "create", Status: string(organization.StatusActive), CreatedAt: now, UpdatedAt: now,
	}).ID)
	assert.Equal(t, organization.StatusActive, getOrganizationByIDRowToDomain(sqlc.GetOrganizationByIDRow{
		ID: id, Name: "Get", Domain: "get.example.com", Workspace: "get", Status: string(organization.StatusActive), CreatedAt: now, UpdatedAt: now,
	}).Status)
	assert.Equal(t, "domain.example.com", getOrganizationByDomainRowToDomain(sqlc.GetOrganizationByDomainRow{
		ID: id, Name: "Domain", Domain: "domain.example.com", Workspace: "domain", Status: string(organization.StatusActive), CreatedAt: now, UpdatedAt: now,
	}).Domain)
	assert.Equal(t, "workspace", getOrganizationByWorkspaceRowToDomain(sqlc.GetOrganizationByWorkspaceRow{
		ID: id, Name: "Workspace", Domain: "workspace.example.com", Workspace: "workspace", Status: string(organization.StatusActive), CreatedAt: now, UpdatedAt: now,
	}).Workspace)
	assert.Equal(t, organization.StatusInactive, listOrganizationsRowToDomain(sqlc.ListOrganizationsRow{
		ID: id, Name: "List", Domain: "list.example.com", Workspace: "list", Status: string(organization.StatusInactive), CreatedAt: now, UpdatedAt: now,
	}).Status)
	assert.Equal(t, "User", listOrganizationsByUserRowToDomain(sqlc.ListOrganizationsByUserRow{
		ID: id, Name: "User", Domain: "user.example.com", Workspace: "user", Status: string(organization.StatusActive), CreatedAt: now, UpdatedAt: now,
	}).Name)
	assert.Equal(t, organization.StatusInactive, listOrganizationsByStatusRowToDomain(sqlc.ListOrganizationsByStatusRow{
		ID: id, Name: "Status", Domain: "status.example.com", Workspace: "status", Status: string(organization.StatusInactive), CreatedAt: now, UpdatedAt: now,
	}).Status)
	assert.Equal(t, now, updateOrganizationRowToDomain(sqlc.UpdateOrganizationRow{
		ID: id, Name: "Update", Domain: "update.example.com", Workspace: "update", Status: string(organization.StatusActive), CreatedAt: now, UpdatedAt: now,
	}).UpdatedAt)
}
