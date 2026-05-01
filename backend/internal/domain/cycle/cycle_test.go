package cycle

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/getbud-co/bud2/backend/internal/domain"
)

var (
	start = time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	end   = time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC)
)

func TestCycle_Validate_Success(t *testing.T) {
	mid := time.Date(2026, 2, 15, 0, 0, 0, 0, time.UTC)

	c := &Cycle{Name: "Q1 2026", Type: TypeQuarterly, StartDate: start, EndDate: end, Status: StatusPlanning, MidReviewDate: &mid}

	assert.NoError(t, c.Validate())
}

func TestCycle_Validate_EndBeforeStart_ReturnsValidationError(t *testing.T) {
	c := &Cycle{
		Name:      "Invalid",
		Type:      TypeCustom,
		StartDate: time.Date(2026, 2, 1, 0, 0, 0, 0, time.UTC),
		EndDate:   time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		Status:    StatusPlanning,
	}

	assert.ErrorIs(t, c.Validate(), domain.ErrValidation)
}

func TestCycle_Validate_InvalidStatus_ReturnsValidationError(t *testing.T) {
	c := &Cycle{
		Name:      "Invalid",
		Type:      TypeAnnual,
		StartDate: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		EndDate:   time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC),
		Status:    Status("unknown"),
	}

	assert.ErrorIs(t, c.Validate(), domain.ErrValidation)
}

func TestNewCycle_GeneratesIDAndValidates(t *testing.T) {
	orgID := uuid.New()
	c, err := NewCycle(orgID, "Q1 2026", TypeQuarterly, start, end, StatusPlanning)
	require.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, c.ID)
	assert.Equal(t, orgID, c.OrganizationID)
	assert.Equal(t, "Q1 2026", c.Name)
	assert.Equal(t, TypeQuarterly, c.Type)
	assert.Equal(t, StatusPlanning, c.Status)
	assert.Nil(t, c.OKRDefinitionDeadline)
	assert.Nil(t, c.MidReviewDate)
}

func TestNewCycle_IDIsAlwaysGenerated(t *testing.T) {
	c1, _ := NewCycle(uuid.New(), "C1", TypeAnnual, start, end, StatusPlanning)
	c2, _ := NewCycle(uuid.New(), "C2", TypeAnnual, start, end, StatusPlanning)
	assert.NotEqual(t, uuid.Nil, c1.ID)
	assert.NotEqual(t, c1.ID, c2.ID)
}

func TestNewCycle_EmptyName_ReturnsValidationError(t *testing.T) {
	_, err := NewCycle(uuid.New(), "", TypeQuarterly, start, end, StatusPlanning)
	assert.ErrorIs(t, err, domain.ErrValidation)
}

func TestNewCycle_InvalidType_ReturnsValidationError(t *testing.T) {
	_, err := NewCycle(uuid.New(), "Q1", Type("unknown"), start, end, StatusPlanning)
	assert.ErrorIs(t, err, domain.ErrValidation)
}

func TestNewCycle_InvalidStatus_ReturnsValidationError(t *testing.T) {
	_, err := NewCycle(uuid.New(), "Q1", TypeQuarterly, start, end, Status("unknown"))
	assert.ErrorIs(t, err, domain.ErrValidation)
}

func TestNewCycle_EndBeforeStart_ReturnsValidationError(t *testing.T) {
	_, err := NewCycle(uuid.New(), "Q1", TypeQuarterly, end, start, StatusPlanning)
	assert.ErrorIs(t, err, domain.ErrValidation)
}

func TestNewCycle_WithOKRDefinitionDeadline_AppliesOption(t *testing.T) {
	deadline := time.Date(2026, 1, 15, 0, 0, 0, 0, time.UTC)
	c, err := NewCycle(uuid.New(), "Q1", TypeQuarterly, start, end, StatusPlanning,
		WithOKRDefinitionDeadline(&deadline))
	require.NoError(t, err)
	require.NotNil(t, c.OKRDefinitionDeadline)
	assert.Equal(t, deadline, *c.OKRDefinitionDeadline)
}

func TestNewCycle_WithMidReviewDate_AppliesOption(t *testing.T) {
	mid := time.Date(2026, 2, 15, 0, 0, 0, 0, time.UTC)
	c, err := NewCycle(uuid.New(), "Q1", TypeQuarterly, start, end, StatusPlanning,
		WithMidReviewDate(&mid))
	require.NoError(t, err)
	require.NotNil(t, c.MidReviewDate)
	assert.Equal(t, mid, *c.MidReviewDate)
}

func TestNewCycle_OKRDeadlineOutsidePeriod_ReturnsValidationError(t *testing.T) {
	before := start.Add(-24 * time.Hour)
	_, err := NewCycle(uuid.New(), "Q1", TypeQuarterly, start, end, StatusPlanning,
		WithOKRDefinitionDeadline(&before))
	assert.ErrorIs(t, err, domain.ErrValidation)
}

func TestNewCycle_MidReviewDateOutsidePeriod_ReturnsValidationError(t *testing.T) {
	after := end.Add(24 * time.Hour)
	_, err := NewCycle(uuid.New(), "Q1", TypeQuarterly, start, end, StatusPlanning,
		WithMidReviewDate(&after))
	assert.ErrorIs(t, err, domain.ErrValidation)
}
