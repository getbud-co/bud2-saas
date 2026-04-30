package checkin

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
)

func TestCreateRequest_ToCommand_PropagatesAllFields(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	indicatorID := uuid.New()
	authorID := uuid.New()
	prev := "40"
	note := "great progress"
	mentions := []string{"@alice", "@bob"}

	r := createRequest{
		IndicatorID:   indicatorID,
		AuthorID:      authorID,
		Value:         "75",
		PreviousValue: &prev,
		Confidence:    "high",
		Note:          &note,
		Mentions:      mentions,
	}
	cmd := r.toCommand(tenantID)

	assert.Equal(t, tenantID, cmd.OrgID)
	assert.Equal(t, indicatorID, cmd.IndicatorID)
	assert.Equal(t, authorID, cmd.AuthorID)
	assert.Equal(t, "75", cmd.Value)
	require.NotNil(t, cmd.PreviousValue)
	assert.Equal(t, "40", *cmd.PreviousValue)
	assert.Equal(t, "high", cmd.Confidence)
	require.NotNil(t, cmd.Note)
	assert.Equal(t, "great progress", *cmd.Note)
	assert.Equal(t, mentions, cmd.Mentions)
}

func TestCreateRequest_ToCommand_NilOptionalFields(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	r := createRequest{
		IndicatorID: uuid.New(),
		AuthorID:    uuid.New(),
		Value:       "50",
		Confidence:  "medium",
	}
	cmd := r.toCommand(tenantID)

	assert.Nil(t, cmd.PreviousValue)
	assert.Nil(t, cmd.Note)
	assert.Nil(t, cmd.Mentions)
}

func TestUpdateRequest_ToCommand_PropagatesFields(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	id := uuid.New()
	note := "updated"

	r := updateRequest{
		Value:      "90",
		Confidence: "barrier",
		Note:       &note,
		Mentions:   []string{"@carol"},
	}
	cmd := r.toCommand(tenantID, id)

	assert.Equal(t, tenantID, cmd.OrgID)
	assert.Equal(t, id, cmd.ID)
	assert.Equal(t, "90", cmd.Value)
	assert.Equal(t, "barrier", cmd.Confidence)
	require.NotNil(t, cmd.Note)
	assert.Equal(t, "updated", *cmd.Note)
	assert.Equal(t, []string{"@carol"}, cmd.Mentions)
}
