package cycle

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"

	"github.com/getbud-co/bud2/backend/internal/domain"
)

func TestCycle_Validate_Success(t *testing.T) {
	start := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC)
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
