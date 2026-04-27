package indicator

import (
	"strings"
	"testing"

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
