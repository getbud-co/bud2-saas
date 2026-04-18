package organization

import (
	"testing"

	"github.com/stretchr/testify/assert"

	org "github.com/getbud-co/bud2/backend/internal/domain/organization"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
)

func TestToResponse(t *testing.T) {
	organization := fixtures.NewOrganization()

	resp := toResponse(organization)

	assert.Equal(t, organization.ID, resp.ID)
	assert.Equal(t, organization.Name, resp.Name)
	assert.Equal(t, organization.Domain, resp.Domain)
	assert.Equal(t, organization.Workspace, resp.Workspace)
	assert.Equal(t, string(org.StatusActive), resp.Status)
	assert.Equal(t, organization.CreatedAt, resp.CreatedAt)
	assert.Equal(t, organization.UpdatedAt, resp.UpdatedAt)
}
