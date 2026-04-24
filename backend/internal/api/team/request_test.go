package team

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"

	"github.com/getbud-co/bud2/backend/internal/domain"
)

func TestCreateRequestToCommand_MapsFields(t *testing.T) {
	tenantID := domain.TenantID(uuid.New())
	description := "Platform team"
	userID := uuid.New()
	req := createRequest{
		Name:        "Platform",
		Description: &description,
		Color:       "orange",
		Members:     []memberInput{{UserID: userID.String(), RoleInTeam: "leader"}},
	}

	cmd := req.toCommand(tenantID)

	assert.Equal(t, tenantID, cmd.OrganizationID)
	assert.Equal(t, "Platform", cmd.Name)
	assert.Equal(t, &description, cmd.Description)
	assert.Equal(t, "orange", cmd.Color)
	assert.Len(t, cmd.Members, 1)
	assert.Equal(t, userID, cmd.Members[0].UserID)
	assert.Equal(t, "leader", cmd.Members[0].RoleInTeam)
}

func TestUpdateRequestToCommand_MapsFields(t *testing.T) {
	tenantID := domain.TenantID(uuid.New())
	id := uuid.New()
	description := "Archive team"
	userID := uuid.New()
	req := updateRequest{
		Name:        "Platform",
		Description: &description,
		Color:       "wine",
		Status:      "archived",
		Members:     []memberInput{{UserID: userID.String(), RoleInTeam: "observer"}},
	}

	cmd := req.toCommand(tenantID, id)

	assert.Equal(t, tenantID, cmd.OrganizationID)
	assert.Equal(t, id, cmd.ID)
	assert.Equal(t, "Platform", cmd.Name)
	assert.Equal(t, &description, cmd.Description)
	assert.Equal(t, "wine", cmd.Color)
	assert.Equal(t, "archived", cmd.Status)
	assert.Len(t, cmd.Members, 1)
	assert.Equal(t, userID, cmd.Members[0].UserID)
	assert.Equal(t, "observer", cmd.Members[0].RoleInTeam)
}

func TestToMemberInputs_PreservesOrderAndRole(t *testing.T) {
	firstID := uuid.New()
	secondID := uuid.New()

	result := toMemberInputs([]memberInput{
		{UserID: firstID.String(), RoleInTeam: "leader"},
		{UserID: secondID.String(), RoleInTeam: "member"},
	})

	assert.Len(t, result, 2)
	assert.Equal(t, firstID, result[0].UserID)
	assert.Equal(t, "leader", result[0].RoleInTeam)
	assert.Equal(t, secondID, result[1].UserID)
	assert.Equal(t, "member", result[1].RoleInTeam)
}
