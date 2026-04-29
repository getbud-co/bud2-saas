package tag

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"

	domaintag "github.com/getbud-co/bud2/backend/internal/domain/tag"
)

func TestToResponse_MapsFieldsCorrectly(t *testing.T) {
	id := uuid.New()
	orgID := uuid.New()
	now := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)

	tag := &domaintag.Tag{
		ID:             id,
		OrganizationID: orgID,
		Name:           "Engineering",
		Color:          domaintag.ColorOrange,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	resp := toResponse(tag)

	assert.Equal(t, id.String(), resp.ID)
	assert.Equal(t, orgID.String(), resp.OrgID)
	assert.Equal(t, "Engineering", resp.Name)
	assert.Equal(t, "orange", resp.Color)
	assert.Equal(t, now.Format(time.RFC3339), resp.CreatedAt)
	assert.Equal(t, now.Format(time.RFC3339), resp.UpdatedAt)
}
