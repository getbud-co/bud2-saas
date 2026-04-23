package user

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"

	"github.com/getbud-co/bud2/backend/internal/domain"
)

func TestCreateRequestToCommand(t *testing.T) {
	tenantID := domain.TenantID(uuid.MustParse("550e8400-e29b-41d4-a716-446655440000"))
	req := createRequest{FirstName: "Test", LastName: "User", Email: "test@example.com", Password: "password123", Role: "super-admin"}

	cmd := req.toCommand(tenantID)

	assert.Equal(t, tenantID, cmd.OrganizationID)
	assert.Equal(t, "Test", cmd.FirstName)
	assert.Equal(t, "User", cmd.LastName)
	assert.Equal(t, "test@example.com", cmd.Email)
	assert.Equal(t, "password123", cmd.Password)
	assert.Equal(t, "super-admin", cmd.Role)
}

func TestUpdateRequestToCommand(t *testing.T) {
	tenantID := domain.TenantID(uuid.MustParse("550e8400-e29b-41d4-a716-446655440000"))
	id := uuid.MustParse("660e8400-e29b-41d4-a716-446655440000")
	req := updateRequest{FirstName: "Updated", LastName: "Name", Email: "test@example.com", Status: "active"}

	cmd := req.toCommand(tenantID, id)

	assert.Equal(t, tenantID, cmd.OrganizationID)
	assert.Equal(t, id, cmd.ID)
	assert.Equal(t, "Updated", cmd.FirstName)
	assert.Equal(t, "Name", cmd.LastName)
	assert.Equal(t, "test@example.com", cmd.Email)
	assert.Equal(t, "active", cmd.Status)
}

func TestUpdateMembershipRequestToCommand(t *testing.T) {
	tenantID := domain.TenantID(uuid.MustParse("550e8400-e29b-41d4-a716-446655440000"))
	id := uuid.MustParse("660e8400-e29b-41d4-a716-446655440000")
	req := updateMembershipRequest{Role: "gestor", Status: "active"}

	cmd := req.toCommand(tenantID, id)

	assert.Equal(t, tenantID, cmd.OrganizationID)
	assert.Equal(t, id, cmd.ID)
	assert.Equal(t, "gestor", cmd.Role)
	assert.Equal(t, "active", cmd.Status)
}
