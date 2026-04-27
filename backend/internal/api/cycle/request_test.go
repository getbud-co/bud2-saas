package cycle

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
)

func TestParseOptionalDate_Cycle_Nil_ReturnsNil(t *testing.T) {
	assert.Nil(t, parseOptionalDate(nil))
}

func TestParseOptionalDate_Cycle_Valid_ReturnsParsedTime(t *testing.T) {
	v := "2026-05-01"
	got := parseOptionalDate(&v)
	require.NotNil(t, got)
	assert.Equal(t, 2026, got.Year())
	assert.Equal(t, time.May, got.Month())
	assert.Equal(t, 1, got.Day())
}

func TestCreateRequest_Cycle_ToCommand_PropagatesFields(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	okrDate := "2026-02-15"
	midDate := "2026-04-01"

	r := createRequest{
		Name:                  "Q1 2026",
		Type:                  "quarterly",
		StartDate:             "2026-01-01",
		EndDate:               "2026-03-31",
		Status:                "active",
		OKRDefinitionDeadline: &okrDate,
		MidReviewDate:         &midDate,
	}
	cmd := r.toCommand(tenantID)

	assert.Equal(t, tenantID, cmd.OrganizationID)
	assert.Equal(t, "Q1 2026", cmd.Name)
	assert.Equal(t, "quarterly", cmd.Type)
	assert.Equal(t, time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC), cmd.StartDate)
	assert.Equal(t, time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC), cmd.EndDate)
	assert.Equal(t, "active", cmd.Status)
	require.NotNil(t, cmd.OKRDefinitionDeadline)
	assert.Equal(t, time.Date(2026, 2, 15, 0, 0, 0, 0, time.UTC), *cmd.OKRDefinitionDeadline)
	require.NotNil(t, cmd.MidReviewDate)
	assert.Equal(t, time.Date(2026, 4, 1, 0, 0, 0, 0, time.UTC), *cmd.MidReviewDate)
}

func TestCreateRequest_Cycle_ToCommand_NilOptionalDates(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	r := createRequest{
		Name:      "Annual",
		Type:      "annual",
		StartDate: "2026-01-01",
		EndDate:   "2026-12-31",
		Status:    "planning",
	}
	cmd := r.toCommand(tenantID)

	assert.Nil(t, cmd.OKRDefinitionDeadline)
	assert.Nil(t, cmd.MidReviewDate)
}

func TestUpdateRequest_Cycle_ToCommand_PropagatesFields(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()

	r := updateRequest{
		Name:      "Q2 2026",
		Type:      "quarterly",
		StartDate: "2026-04-01",
		EndDate:   "2026-06-30",
		Status:    "review",
	}
	cmd := r.toCommand(tenantID, tenantID.UUID())

	assert.Equal(t, "Q2 2026", cmd.Name)
	assert.Equal(t, time.Date(2026, 4, 1, 0, 0, 0, 0, time.UTC), cmd.StartDate)
	assert.Equal(t, time.Date(2026, 6, 30, 0, 0, 0, 0, time.UTC), cmd.EndDate)
	assert.Equal(t, "review", cmd.Status)
}
