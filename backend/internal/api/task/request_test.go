package task

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
)

func TestUpdateRequest_IsEmpty_AllNil(t *testing.T) {
	r := updateRequest{}
	assert.True(t, r.isEmpty())
}

func TestUpdateRequest_IsEmpty_AnyFieldSet_False(t *testing.T) {
	title := "x"
	indicatorID := uuid.New()
	assigneeID := uuid.New()
	dueDate := "2026-05-01"
	cases := map[string]updateRequest{
		"title":        {Title: &title},
		"description":  {Description: &title},
		"indicator_id": {IndicatorID: &indicatorID},
		"assignee_id":  {AssigneeID: &assigneeID},
		"status":       {Status: &title},
		"due_date":     {DueDate: &dueDate},
	}
	for name, r := range cases {
		t.Run(name, func(t *testing.T) {
			assert.Falsef(t, r.isEmpty(), "field %q must register as set", name)
		})
	}
}

func TestCreateRequest_Task_ToCommand_PropagatesFields(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	missionID := uuid.New()
	indicatorID := uuid.New()
	assigneeID := uuid.New()
	desc := "triage"
	dueDate := "2026-06-30"

	r := createRequest{
		MissionID:   missionID,
		IndicatorID: &indicatorID,
		AssigneeID:  assigneeID,
		Title:       "Fix bug",
		Description: &desc,
		Status:      "todo",
		DueDate:     &dueDate,
	}
	cmd := r.toCommand(tenantID)

	assert.Equal(t, tenantID, cmd.OrganizationID)
	assert.Equal(t, missionID, cmd.MissionID)
	require.NotNil(t, cmd.IndicatorID)
	assert.Equal(t, indicatorID, *cmd.IndicatorID)
	assert.Equal(t, assigneeID, cmd.AssigneeID)
	assert.Equal(t, "Fix bug", cmd.Title)
	require.NotNil(t, cmd.Description)
	assert.Equal(t, "triage", *cmd.Description)
	assert.Equal(t, "todo", cmd.Status)
	require.NotNil(t, cmd.DueDate)
	assert.Equal(t, 2026, cmd.DueDate.Year())
}

func TestCreateRequest_Task_ToCommand_NilIndicatorID(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	r := createRequest{
		MissionID:  uuid.New(),
		AssigneeID: uuid.New(),
		Title:      "Standalone task",
		Status:     "in_progress",
	}
	cmd := r.toCommand(tenantID)

	assert.Nil(t, cmd.IndicatorID)
	assert.Nil(t, cmd.Description)
	assert.Nil(t, cmd.DueDate)
}

func TestUpdateRequest_Task_ToCommand_PropagatesPointers(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	id := uuid.New()
	title := "new"
	r := updateRequest{Title: &title}

	cmd := r.toCommand(tenantID, id)

	assert.Equal(t, tenantID, cmd.OrganizationID)
	assert.Equal(t, id, cmd.ID)
	require.NotNil(t, cmd.Title)
	assert.Equal(t, "new", *cmd.Title)
	assert.Nil(t, cmd.Description)
	assert.Nil(t, cmd.IndicatorID)
	assert.Nil(t, cmd.AssigneeID)
	assert.Nil(t, cmd.Status)
	assert.Nil(t, cmd.DueDate)
}
