package indicator

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
	target := 100.0
	ownerID := uuid.New()
	dueDate := "2026-05-01"
	cases := map[string]updateRequest{
		"title":        {Title: &title},
		"description":  {Description: &title},
		"owner_id":     {OwnerID: &ownerID},
		"target_value": {TargetValue: &target},
		"current_value": {CurrentValue: &target},
		"unit":         {Unit: &title},
		"status":       {Status: &title},
		"due_date":     {DueDate: &dueDate},
	}
	for name, r := range cases {
		t.Run(name, func(t *testing.T) {
			assert.Falsef(t, r.isEmpty(), "field %q must register as set", name)
		})
	}
}

func TestCreateRequest_Indicator_ToCommand_PropagatesFields(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	missionID := uuid.New()
	ownerID := uuid.New()
	desc := "Reduce churn"
	target := 100.0
	current := 50.0
	unit := "%"
	dueDate := "2026-12-31"

	r := createRequest{
		MissionID:    missionID,
		OwnerID:      ownerID,
		Title:        "Churn Rate",
		Description:  &desc,
		TargetValue:  &target,
		CurrentValue: &current,
		Unit:         &unit,
		Status:       "active",
		DueDate:      &dueDate,
	}
	cmd := r.toCommand(tenantID)

	assert.Equal(t, tenantID, cmd.OrganizationID)
	assert.Equal(t, missionID, cmd.MissionID)
	assert.Equal(t, ownerID, cmd.OwnerID)
	assert.Equal(t, "Churn Rate", cmd.Title)
	require.NotNil(t, cmd.Description)
	assert.Equal(t, "Reduce churn", *cmd.Description)
	require.NotNil(t, cmd.TargetValue)
	assert.Equal(t, 100.0, *cmd.TargetValue)
	require.NotNil(t, cmd.CurrentValue)
	assert.Equal(t, 50.0, *cmd.CurrentValue)
	require.NotNil(t, cmd.Unit)
	assert.Equal(t, "%", *cmd.Unit)
	assert.Equal(t, "active", cmd.Status)
	require.NotNil(t, cmd.DueDate)
	assert.Equal(t, 2026, cmd.DueDate.Year())
}

func TestCreateRequest_Indicator_ToCommand_NilOptionals(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	r := createRequest{
		MissionID: uuid.New(),
		OwnerID:   uuid.New(),
		Title:     "KPI",
		Status:    "draft",
	}
	cmd := r.toCommand(tenantID)

	assert.Nil(t, cmd.Description)
	assert.Nil(t, cmd.TargetValue)
	assert.Nil(t, cmd.CurrentValue)
	assert.Nil(t, cmd.Unit)
	assert.Nil(t, cmd.DueDate)
}

func TestUpdateRequest_Indicator_ToCommand_PropagatesPointers(t *testing.T) {
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
	assert.Nil(t, cmd.OwnerID)
	assert.Nil(t, cmd.TargetValue)
	assert.Nil(t, cmd.CurrentValue)
	assert.Nil(t, cmd.Unit)
	assert.Nil(t, cmd.Status)
	assert.Nil(t, cmd.DueDate)
}
