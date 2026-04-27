package mission

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
)

func TestParseOptionalDate_Nil_ReturnsNil(t *testing.T) {
	assert.Nil(t, parseOptionalDate(nil))
}

func TestParseOptionalDate_Valid_ReturnsParsedTime(t *testing.T) {
	v := "2026-05-01"
	got := parseOptionalDate(&v)
	require.NotNil(t, got)
	assert.Equal(t, 2026, got.Year())
	assert.Equal(t, 5, int(got.Month()))
	assert.Equal(t, 1, got.Day())
}

func TestParseOptionalDate_InvalidFormat_ReturnsNil(t *testing.T) {
	// Validator at the boundary should reject this, but the parser must not
	// silently produce a zero-value pointer if upstream protection is bypassed.
	v := "2026/05/01"
	assert.Nil(t, parseOptionalDate(&v))
}

func TestUpdateRequest_IsEmpty_AllNil(t *testing.T) {
	r := updateRequest{}
	assert.True(t, r.isEmpty())
}

func TestUpdateRequest_IsEmpty_AnyFieldSet_False(t *testing.T) {
	title := "x"
	cases := map[string]updateRequest{
		"title":         {Title: &title},
		"description":   {Description: &title},
		"cycle_id":      {CycleID: ptrUUID(uuid.New())},
		"owner_id":      {OwnerID: ptrUUID(uuid.New())},
		"team_id":       {TeamID: ptrUUID(uuid.New())},
		"status":        {Status: &title},
		"visibility":    {Visibility: &title},
		"kanban_status": {KanbanStatus: &title},
		"sort_order":    {SortOrder: ptrInt(0)}, // zero is still set
		"due_date":      {DueDate: &title},
	}
	for name, r := range cases {
		t.Run(name, func(t *testing.T) {
			assert.Falsef(t, r.isEmpty(), "field %q must register as set", name)
		})
	}
}

func TestCreateRequest_ToCommand_PropagatesFields(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	desc := "d"
	due := "2026-05-01"
	cycleID := uuid.New()
	parentID := uuid.New()
	ownerID := uuid.New()
	teamID := uuid.New()

	r := createRequest{
		Title:        "T",
		Description:  &desc,
		CycleID:      &cycleID,
		ParentID:     &parentID,
		OwnerID:      ownerID,
		TeamID:       &teamID,
		Status:       "active",
		Visibility:   "public",
		KanbanStatus: "todo",
		SortOrder:    7,
		DueDate:      &due,
	}
	cmd := r.toCommand(tenantID)

	assert.Equal(t, tenantID, cmd.OrganizationID)
	assert.Equal(t, "T", cmd.Title)
	require.NotNil(t, cmd.Description)
	assert.Equal(t, "d", *cmd.Description)
	require.NotNil(t, cmd.CycleID)
	assert.Equal(t, cycleID, *cmd.CycleID)
	require.NotNil(t, cmd.ParentID)
	assert.Equal(t, parentID, *cmd.ParentID)
	assert.Equal(t, ownerID, cmd.OwnerID)
	require.NotNil(t, cmd.TeamID)
	assert.Equal(t, teamID, *cmd.TeamID)
	assert.Equal(t, "active", cmd.Status)
	assert.Equal(t, 7, cmd.SortOrder)
	require.NotNil(t, cmd.DueDate)
	assert.Equal(t, 2026, cmd.DueDate.Year())
}

func TestUpdateRequest_ToCommand_PropagatesPointers(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	id := uuid.New()
	title := "new"
	r := updateRequest{Title: &title}

	cmd := r.toCommand(tenantID, id)

	assert.Equal(t, tenantID, cmd.OrganizationID)
	assert.Equal(t, id, cmd.ID)
	require.NotNil(t, cmd.Title)
	assert.Equal(t, "new", *cmd.Title)
	// Untouched fields stay nil; this is the contract that lets the use case
	// distinguish "preserve" from "clear" / "set".
	assert.Nil(t, cmd.Description)
	assert.Nil(t, cmd.CycleID)
	assert.Nil(t, cmd.OwnerID)
	assert.Nil(t, cmd.TeamID)
	assert.Nil(t, cmd.Status)
	assert.Nil(t, cmd.Visibility)
	assert.Nil(t, cmd.KanbanStatus)
	assert.Nil(t, cmd.SortOrder)
	assert.Nil(t, cmd.DueDate)
}

func ptrUUID(u uuid.UUID) *uuid.UUID { return &u }
func ptrInt(i int) *int              { return &i }
