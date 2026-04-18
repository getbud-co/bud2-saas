package organization

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

func TestCreateRequestToCommand(t *testing.T) {
	req := createRequest{Name: "Test Org", Domain: "admin@example.com", Workspace: "example", Status: "active"}

	cmd := req.toCommand()

	assert.Equal(t, "Test Org", cmd.Name)
	assert.Equal(t, "admin@example.com", cmd.Domain)
	assert.Equal(t, "example", cmd.Workspace)
	assert.Equal(t, "active", cmd.Status)
}

func TestUpdateRequestToCommand(t *testing.T) {
	id := uuid.MustParse("550e8400-e29b-41d4-a716-446655440000")
	req := updateRequest{Name: "Updated Org", Domain: "admin@example.com", Workspace: "example", Status: "inactive"}

	cmd := req.toCommand(id)

	assert.Equal(t, id, cmd.ID)
	assert.Equal(t, "Updated Org", cmd.Name)
	assert.Equal(t, "admin@example.com", cmd.Domain)
	assert.Equal(t, "example", cmd.Workspace)
	assert.Equal(t, "inactive", cmd.Status)
}
