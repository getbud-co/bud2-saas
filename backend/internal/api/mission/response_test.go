package mission

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	domainmission "github.com/getbud-co/bud2/backend/internal/domain/mission"
)

func TestToResponse_AllFieldsPopulated_FormatsCorrectly(t *testing.T) {
	id := uuid.New()
	orgID := uuid.New()
	ownerID := uuid.New()
	cycleID := uuid.New()
	parentID := uuid.New()
	teamID := uuid.New()
	desc := "d"
	due := time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC)
	completed := time.Date(2026, 6, 15, 13, 0, 0, 0, time.UTC)
	created := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	updated := time.Date(2026, 2, 1, 0, 0, 0, 0, time.UTC)

	m := &domainmission.Mission{
		ID: id, OrganizationID: orgID,
		CycleID: &cycleID, ParentID: &parentID,
		OwnerID: ownerID, TeamID: &teamID,
		Title:        "T",
		Description:  &desc,
		Status:       domainmission.StatusActive,
		Visibility:   domainmission.VisibilityPublic,
		KanbanStatus: domainmission.KanbanTodo,
		SortOrder:    3,
		DueDate:      &due,
		CompletedAt:  &completed,
		CreatedAt:    created,
		UpdatedAt:    updated,
	}

	r := toResponse(m)

	assert.Equal(t, id.String(), r.ID)
	assert.Equal(t, orgID.String(), r.OrgID)
	require.NotNil(t, r.CycleID)
	assert.Equal(t, cycleID.String(), *r.CycleID)
	require.NotNil(t, r.ParentID)
	assert.Equal(t, parentID.String(), *r.ParentID)
	assert.Equal(t, ownerID.String(), r.OwnerID)
	require.NotNil(t, r.TeamID)
	assert.Equal(t, teamID.String(), *r.TeamID)
	assert.Equal(t, "T", r.Title)
	require.NotNil(t, r.Description)
	assert.Equal(t, "d", *r.Description)
	assert.Equal(t, "active", r.Status)
	assert.Equal(t, "public", r.Visibility)
	assert.Equal(t, "todo", r.KanbanStatus)
	assert.Equal(t, 3, r.SortOrder)
	require.NotNil(t, r.DueDate)
	assert.Equal(t, "2026-05-01", *r.DueDate)
	require.NotNil(t, r.CompletedAt)
	assert.Equal(t, "2026-06-15T13:00:00Z", *r.CompletedAt)
	assert.Equal(t, "2026-01-01T00:00:00Z", r.CreatedAt)
	assert.Equal(t, "2026-02-01T00:00:00Z", r.UpdatedAt)
}

func TestToResponse_NilOptionals_OmitOrNullify(t *testing.T) {
	m := &domainmission.Mission{
		ID:             uuid.New(),
		OrganizationID: uuid.New(),
		OwnerID:        uuid.New(),
		Title:          "T",
		Status:         domainmission.StatusDraft,
		Visibility:     domainmission.VisibilityPublic,
		KanbanStatus:   domainmission.KanbanUncategorized,
	}

	r := toResponse(m)

	assert.Nil(t, r.CycleID)
	assert.Nil(t, r.ParentID)
	assert.Nil(t, r.TeamID)
	assert.Nil(t, r.Description)
	assert.Nil(t, r.DueDate)
	assert.Nil(t, r.CompletedAt)
}

func TestUUIDPtrString_NilInput_ReturnsNil(t *testing.T) {
	assert.Nil(t, uuidPtrString(nil))
}

func TestFormatOptionalDate_NilInput_ReturnsNil(t *testing.T) {
	assert.Nil(t, formatOptionalDate(nil))
}

func TestFormatOptionalTimestamp_NilInput_ReturnsNil(t *testing.T) {
	assert.Nil(t, formatOptionalTimestamp(nil))
}
