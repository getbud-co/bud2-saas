package cycle

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	domaincycle "github.com/getbud-co/bud2/backend/internal/domain/cycle"
)

func TestToResponse_Cycle_AllFieldsPopulated_FormatsCorrectly(t *testing.T) {
	id := uuid.New()
	orgID := uuid.New()
	start := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC)
	okr := time.Date(2026, 1, 31, 0, 0, 0, 0, time.UTC)
	mid := time.Date(2026, 2, 15, 0, 0, 0, 0, time.UTC)
	created := time.Date(2026, 1, 1, 9, 0, 0, 0, time.UTC)
	updated := time.Date(2026, 2, 1, 9, 0, 0, 0, time.UTC)

	c := &domaincycle.Cycle{
		ID:                    id,
		OrganizationID:        orgID,
		Name:                  "Q1 2026",
		Type:                  domaincycle.TypeQuarterly,
		StartDate:             start,
		EndDate:               end,
		Status:                domaincycle.StatusActive,
		OKRDefinitionDeadline: &okr,
		MidReviewDate:         &mid,
		CreatedAt:             created,
		UpdatedAt:             updated,
	}

	r := toResponse(c)

	assert.Equal(t, id.String(), r.ID)
	assert.Equal(t, orgID.String(), r.OrgID)
	assert.Equal(t, "Q1 2026", r.Name)
	assert.Equal(t, "quarterly", r.Type)
	assert.Equal(t, "2026-01-01", r.StartDate)
	assert.Equal(t, "2026-03-31", r.EndDate)
	assert.Equal(t, "active", r.Status)
	require.NotNil(t, r.OKRDefinitionDeadline)
	assert.Equal(t, "2026-01-31", *r.OKRDefinitionDeadline)
	require.NotNil(t, r.MidReviewDate)
	assert.Equal(t, "2026-02-15", *r.MidReviewDate)
	assert.Equal(t, "2026-01-01T09:00:00Z", r.CreatedAt)
	assert.Equal(t, "2026-02-01T09:00:00Z", r.UpdatedAt)
}

func TestToResponse_Cycle_NilOptionalDates_OmitFromResponse(t *testing.T) {
	c := &domaincycle.Cycle{
		ID:             uuid.New(),
		OrganizationID: uuid.New(),
		Name:           "Annual",
		Type:           domaincycle.TypeAnnual,
		StartDate:      time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		EndDate:        time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC),
		Status:         domaincycle.StatusPlanning,
	}

	r := toResponse(c)

	assert.Nil(t, r.OKRDefinitionDeadline)
	assert.Nil(t, r.MidReviewDate)
	assert.Equal(t, "2026-01-01", r.StartDate)
	assert.Equal(t, "2026-12-31", r.EndDate)
}

func TestFormatOptionalDate_Cycle_NilInput_ReturnsNil(t *testing.T) {
	assert.Nil(t, formatOptionalDate(nil))
}
