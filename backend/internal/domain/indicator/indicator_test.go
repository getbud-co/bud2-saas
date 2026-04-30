package indicator

import (
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"

	"github.com/getbud-co/bud2/backend/internal/domain"
)

func TestStatus_IsValid(t *testing.T) {
	for _, s := range []Status{StatusDraft, StatusActive, StatusAtRisk, StatusDone, StatusArchived} {
		assert.Truef(t, s.IsValid(), "%q should be valid", s)
	}
	assert.False(t, Status("nope").IsValid())
	assert.False(t, Status("").IsValid())
}

func TestIndicator_Validate_RejectsEmptyTitle(t *testing.T) {
	i := newValid()
	i.Title = ""
	assert.ErrorIs(t, i.Validate(), domain.ErrValidation)
}

func TestIndicator_Validate_RejectsLongTitle(t *testing.T) {
	i := newValid()
	i.Title = strings.Repeat("a", 201)
	assert.ErrorIs(t, i.Validate(), domain.ErrValidation)
}

func TestIndicator_Validate_RejectsLongUnit(t *testing.T) {
	i := newValid()
	long := strings.Repeat("u", 33)
	i.Unit = &long
	assert.ErrorIs(t, i.Validate(), domain.ErrValidation)
}

func TestIndicator_Validate_RejectsInvalidStatus(t *testing.T) {
	i := newValid()
	i.Status = "bogus"
	assert.ErrorIs(t, i.Validate(), domain.ErrValidation)
}

func TestMeasurementMode_IsValid(t *testing.T) {
	for _, m := range []MeasurementMode{MeasurementModeManual, MeasurementModeSurvey, MeasurementModeTask, MeasurementModeMission, MeasurementModeExternal} {
		assert.Truef(t, m.IsValid(), "%q should be valid", m)
	}
	assert.False(t, MeasurementMode("nope").IsValid())
}

func TestGoalType_IsValid(t *testing.T) {
	for _, g := range []GoalType{GoalTypeReach, GoalTypeAbove, GoalTypeBelow, GoalTypeBetween, GoalTypeSurvey} {
		assert.Truef(t, g.IsValid(), "%q should be valid", g)
	}
	assert.False(t, GoalType("nope").IsValid())
}

func TestIndicator_Validate_RejectsInvalidMeasurementMode(t *testing.T) {
	i := newValid()
	i.MeasurementMode = "bogus"
	assert.ErrorIs(t, i.Validate(), domain.ErrValidation)
}

func TestIndicator_Validate_RejectsInvalidGoalType(t *testing.T) {
	i := newValid()
	i.GoalType = "bogus"
	assert.ErrorIs(t, i.Validate(), domain.ErrValidation)
}

func TestIndicator_Validate_RejectsLowThresholdAboveHigh(t *testing.T) {
	i := newValid()
	lo, hi := 10.0, 5.0
	i.LowThreshold, i.HighThreshold = &lo, &hi
	assert.ErrorIs(t, i.Validate(), domain.ErrValidation)
}

func TestIndicator_Validate_AcceptsLowThresholdEqualToHigh(t *testing.T) {
	i := newValid()
	v := 5.0
	i.LowThreshold, i.HighThreshold = &v, &v
	assert.NoError(t, i.Validate())
}

func TestIndicator_Validate_RejectsPeriodStartAfterEnd(t *testing.T) {
	i := newValid()
	start := mustParseDate("2024-06-01")
	end := mustParseDate("2024-01-01")
	i.PeriodStart, i.PeriodEnd = &start, &end
	assert.ErrorIs(t, i.Validate(), domain.ErrValidation)
}

func TestIndicator_Validate_AcceptsPeriodStartEqualToEnd(t *testing.T) {
	i := newValid()
	d := mustParseDate("2024-06-01")
	i.PeriodStart, i.PeriodEnd = &d, &d
	assert.NoError(t, i.Validate())
}

func TestIndicator_Validate_AcceptsValidIndicator(t *testing.T) {
	assert.NoError(t, newValid().Validate())
}

func newValid() *Indicator {
	return &Indicator{
		ID:             uuid.New(),
		OrganizationID: uuid.New(),
		MissionID:      uuid.New(),
		OwnerID:        uuid.New(),
		Title:          "Reduzir churn",
		Status:         StatusActive,
	}
}

func mustParseDate(s string) time.Time {
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		panic(err)
	}
	return t
}
