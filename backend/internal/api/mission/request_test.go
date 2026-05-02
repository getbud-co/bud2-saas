package mission

import (
	"testing"
	"time"

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
		"owner_id":      {OwnerID: ptrUUID(uuid.New())},
		"team_id":       {TeamID: ptrUUID(uuid.New())},
		"status":        {Status: &title},
		"visibility":    {Visibility: &title},
		"kanban_status": {KanbanStatus: &title},
		"start_date":    {StartDate: &title},
		"end_date":      {EndDate: &title},
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
	parentID := uuid.New()
	ownerID := uuid.New()
	teamID := uuid.New()

	r := createRequest{
		Title:        "T",
		Description:  &desc,
		ParentID:     &parentID,
		OwnerID:      ownerID,
		TeamID:       &teamID,
		Status:       "active",
		Visibility:   "public",
		KanbanStatus: "todo",
		StartDate:    "2026-01-01",
		EndDate:      "2026-05-01",
	}
	cmd, err := r.toCommand(tenantID)

	require.NoError(t, err)
	assert.Equal(t, tenantID, cmd.OrganizationID)
	assert.Equal(t, "T", cmd.Root.Title)
	require.NotNil(t, cmd.Root.Description)
	assert.Equal(t, "d", *cmd.Root.Description)
	require.NotNil(t, cmd.ParentID)
	assert.Equal(t, parentID, *cmd.ParentID)
	require.NotNil(t, cmd.Root.OwnerID)
	assert.Equal(t, ownerID, *cmd.Root.OwnerID)
	require.NotNil(t, cmd.Root.TeamID)
	assert.Equal(t, teamID, *cmd.Root.TeamID)
	assert.Equal(t, "active", cmd.Root.Status)
	assert.Equal(t, time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC), cmd.Root.StartDate)
	assert.Equal(t, time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC), cmd.Root.EndDate)
}

func TestCreateRequest_ToCommand_InvalidStartDate_ReturnsError(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	r := createRequest{
		Title:     "T",
		OwnerID:   uuid.New(),
		StartDate: "not-a-date",
		EndDate:   "2026-05-01",
	}
	_, err := r.toCommand(tenantID)
	assert.Error(t, err)
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
	// Untouched fields stay nil so the use case preserves existing values.
	assert.Nil(t, cmd.Description)
	assert.Nil(t, cmd.OwnerID)
	assert.Nil(t, cmd.TeamID)
	assert.Nil(t, cmd.Status)
	assert.Nil(t, cmd.Visibility)
	assert.Nil(t, cmd.KanbanStatus)
	assert.Nil(t, cmd.StartDate)
	assert.Nil(t, cmd.EndDate)
}

func ptrUUID(u uuid.UUID) *uuid.UUID { return &u }

func TestMapChildren_ExceedsMaxDepth_ReturnsError(t *testing.T) {
	// Build a chain of maxMissionTreeDepth+1 levels to trigger the guard.
	leaf := createMissionChildInline{
		Title:     "leaf",
		StartDate: "2026-01-01",
		EndDate:   "2026-12-31",
	}
	node := leaf
	for i := 0; i < maxMissionTreeDepth; i++ {
		node = createMissionChildInline{
			Title:     "node",
			StartDate: "2026-01-01",
			EndDate:   "2026-12-31",
			Children:  []createMissionChildInline{node},
		}
	}
	_, err := mapChildren([]createMissionChildInline{node})
	assert.ErrorContains(t, err, "maximum depth")
}

func TestMapChildren_AtMaxDepth_Succeeds(t *testing.T) {
	// A chain of exactly maxMissionTreeDepth levels must be accepted.
	leaf := createMissionChildInline{
		Title:     "leaf",
		StartDate: "2026-01-01",
		EndDate:   "2026-12-31",
	}
	node := leaf
	for i := 0; i < maxMissionTreeDepth-1; i++ {
		node = createMissionChildInline{
			Title:     "node",
			StartDate: "2026-01-01",
			EndDate:   "2026-12-31",
			Children:  []createMissionChildInline{node},
		}
	}
	out, err := mapChildren([]createMissionChildInline{node})
	require.NoError(t, err)
	require.Len(t, out, 1)
}
