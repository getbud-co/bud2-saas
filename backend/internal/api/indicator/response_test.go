package indicator

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	domainindicator "github.com/getbud-co/bud2/backend/internal/domain/indicator"
)

func TestToResponse_Indicator_AllFieldsPopulated(t *testing.T) {
	id := uuid.New()
	orgID := uuid.New()
	missionID := uuid.New()
	ownerID := uuid.New()
	desc := "track churn"
	target := 100.0
	current := 50.0
	unit := "%"
	due := time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC)
	created := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	updated := time.Date(2026, 2, 1, 0, 0, 0, 0, time.UTC)

	i := &domainindicator.Indicator{
		ID:             id,
		OrganizationID: orgID,
		MissionID:      missionID,
		OwnerID:        ownerID,
		Title:          "Churn Rate",
		Description:    &desc,
		TargetValue:    &target,
		CurrentValue:   &current,
		Unit:           &unit,
		Status:         domainindicator.StatusActive,
		DueDate:        &due,
		CreatedAt:      created,
		UpdatedAt:      updated,
	}

	r := toResponse(i)

	assert.Equal(t, id.String(), r.ID)
	assert.Equal(t, orgID.String(), r.OrgID)
	assert.Equal(t, missionID.String(), r.MissionID)
	assert.Equal(t, ownerID.String(), r.OwnerID)
	assert.Equal(t, "Churn Rate", r.Title)
	require.NotNil(t, r.Description)
	assert.Equal(t, "track churn", *r.Description)
	require.NotNil(t, r.TargetValue)
	assert.Equal(t, 100.0, *r.TargetValue)
	require.NotNil(t, r.CurrentValue)
	assert.Equal(t, 50.0, *r.CurrentValue)
	require.NotNil(t, r.Unit)
	assert.Equal(t, "%", *r.Unit)
	assert.Equal(t, "active", r.Status)
	require.NotNil(t, r.DueDate)
	assert.Equal(t, "2026-12-31", *r.DueDate)
	assert.Equal(t, "2026-01-01T00:00:00Z", r.CreatedAt)
	assert.Equal(t, "2026-02-01T00:00:00Z", r.UpdatedAt)
}

func TestToResponse_Indicator_NilOptionals_OmitFromResponse(t *testing.T) {
	i := &domainindicator.Indicator{
		ID:             uuid.New(),
		OrganizationID: uuid.New(),
		MissionID:      uuid.New(),
		OwnerID:        uuid.New(),
		Title:          "KPI",
		Status:         domainindicator.StatusDraft,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	r := toResponse(i)

	assert.Nil(t, r.Description)
	assert.Nil(t, r.TargetValue)
	assert.Nil(t, r.CurrentValue)
	assert.Nil(t, r.Unit)
	assert.Nil(t, r.DueDate)
}
