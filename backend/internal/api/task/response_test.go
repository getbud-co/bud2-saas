package task

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	domaintask "github.com/getbud-co/bud2/backend/internal/domain/task"
)

func TestToResponse_Task_AllFieldsPopulated(t *testing.T) {
	id := uuid.New()
	orgID := uuid.New()
	missionID := uuid.New()
	indicatorID := uuid.New()
	assigneeID := uuid.New()
	desc := "fix it"
	due := time.Date(2026, 6, 30, 0, 0, 0, 0, time.UTC)
	completed := time.Date(2026, 6, 28, 12, 0, 0, 0, time.UTC)
	created := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	updated := time.Date(2026, 2, 1, 0, 0, 0, 0, time.UTC)

	task := &domaintask.Task{
		ID:             id,
		OrganizationID: orgID,
		MissionID:      missionID,
		IndicatorID:    &indicatorID,
		AssigneeID:     assigneeID,
		Title:          "Fix bug",
		Description:    &desc,
		Status:         domaintask.StatusDone,
		DueDate:        &due,
		CompletedAt:    &completed,
		CreatedAt:      created,
		UpdatedAt:      updated,
	}

	r := toResponse(task)

	assert.Equal(t, id.String(), r.ID)
	assert.Equal(t, orgID.String(), r.OrgID)
	assert.Equal(t, missionID.String(), r.MissionID)
	require.NotNil(t, r.IndicatorID)
	assert.Equal(t, indicatorID.String(), *r.IndicatorID)
	assert.Equal(t, assigneeID.String(), r.AssigneeID)
	assert.Equal(t, "Fix bug", r.Title)
	require.NotNil(t, r.Description)
	assert.Equal(t, "fix it", *r.Description)
	assert.Equal(t, "done", r.Status)
	require.NotNil(t, r.DueDate)
	assert.Equal(t, "2026-06-30", *r.DueDate)
	require.NotNil(t, r.CompletedAt)
	assert.Equal(t, "2026-06-28T12:00:00Z", *r.CompletedAt)
	assert.Equal(t, "2026-01-01T00:00:00Z", r.CreatedAt)
	assert.Equal(t, "2026-02-01T00:00:00Z", r.UpdatedAt)
}

func TestToResponse_Task_NilIndicatorID_OmitsFromResponse(t *testing.T) {
	task := &domaintask.Task{
		ID:             uuid.New(),
		OrganizationID: uuid.New(),
		MissionID:      uuid.New(),
		AssigneeID:     uuid.New(),
		Title:          "Standalone",
		Status:         domaintask.StatusTodo,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	r := toResponse(task)

	assert.Nil(t, r.IndicatorID)
	assert.Nil(t, r.Description)
	assert.Nil(t, r.DueDate)
	assert.Nil(t, r.CompletedAt)
}
