package user

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"

	"github.com/getbud-co/bud2/backend/internal/domain"
)

func TestCreateRequestToCommand(t *testing.T) {
	tenantID := domain.TenantID(uuid.MustParse("550e8400-e29b-41d4-a716-446655440000"))
	req := createRequest{Name: "Test User", Email: "test@example.com", Password: "password123", Role: "admin"}

	cmd := req.toCommand(tenantID)

	assert.Equal(t, tenantID, cmd.OrganizationID)
	assert.Equal(t, "Test User", cmd.Name)
	assert.Equal(t, "test@example.com", cmd.Email)
	assert.Equal(t, "password123", cmd.Password)
	assert.Equal(t, "admin", cmd.Role)
}

func TestUpdateRequestToCommand(t *testing.T) {
	tenantID := domain.TenantID(uuid.MustParse("550e8400-e29b-41d4-a716-446655440000"))
	id := uuid.MustParse("660e8400-e29b-41d4-a716-446655440000")
	req := updateRequest{Name: "Updated", Email: "test@example.com", Status: "active"}

	cmd := req.toCommand(tenantID, id)

	assert.Equal(t, tenantID, cmd.OrganizationID)
	assert.Equal(t, id, cmd.ID)
	assert.Equal(t, "Updated", cmd.Name)
	assert.Equal(t, "test@example.com", cmd.Email)
	assert.Equal(t, "active", cmd.Status)
}

func TestUpdateMembershipRequestToCommand(t *testing.T) {
	tenantID := domain.TenantID(uuid.MustParse("550e8400-e29b-41d4-a716-446655440000"))
	id := uuid.MustParse("660e8400-e29b-41d4-a716-446655440000")
	req := updateMembershipRequest{Role: "manager", Status: "active"}

	cmd := req.toCommand(tenantID, id)

	assert.Equal(t, tenantID, cmd.OrganizationID)
	assert.Equal(t, id, cmd.ID)
	assert.Equal(t, "manager", cmd.Role)
	assert.Equal(t, "active", cmd.Status)
}
