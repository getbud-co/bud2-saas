package checkin_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	appcheckin "github.com/getbud-co/bud2/backend/internal/app/checkin"
	domaincheckin "github.com/getbud-co/bud2/backend/internal/domain/checkin"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func TestUpdateUseCase_Execute_Success(t *testing.T) {
	id := uuid.New()
	tenantID := fixtures.NewTestTenantID()
	existing := &domaincheckin.CheckIn{
		ID: id, OrgID: tenantID.UUID(),
		IndicatorID: uuid.New(), AuthorID: uuid.New(),
		Value: "50", Confidence: domaincheckin.ConfidenceMedium,
		Mentions: []string{},
	}
	updated := &domaincheckin.CheckIn{ID: id, Value: "80", Confidence: domaincheckin.ConfidenceHigh}

	repo := &mocks.CheckInRepository{}
	repo.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(existing, nil)
	repo.On("Update", mock.Anything, mock.MatchedBy(func(c *domaincheckin.CheckIn) bool {
		return c.ID == id && c.Value == "80" && c.Confidence == domaincheckin.ConfidenceHigh
	})).Return(updated, nil)

	uc := appcheckin.NewUpdateUseCase(repo, testutil.NewDiscardLogger())
	got, err := uc.Execute(context.Background(), appcheckin.UpdateCommand{
		OrgID:      tenantID,
		ID:         id,
		Value:      "80",
		Confidence: "high",
	})

	require.NoError(t, err)
	assert.Equal(t, updated, got)
	repo.AssertExpectations(t)
}

func TestUpdateUseCase_Execute_NotFound_PropagatesError(t *testing.T) {
	repo := &mocks.CheckInRepository{}
	repo.On("GetByID", mock.Anything, mock.Anything, mock.Anything).Return(nil, domaincheckin.ErrNotFound)

	uc := appcheckin.NewUpdateUseCase(repo, testutil.NewDiscardLogger())
	_, err := uc.Execute(context.Background(), appcheckin.UpdateCommand{
		OrgID:      fixtures.NewTestTenantID(),
		ID:         uuid.New(),
		Value:      "50",
		Confidence: "high",
	})

	assert.ErrorIs(t, err, domaincheckin.ErrNotFound)
	repo.AssertNotCalled(t, "Update")
}

func TestUpdateUseCase_Execute_InvalidConfidence_ReturnsValidationError(t *testing.T) {
	id := uuid.New()
	tenantID := fixtures.NewTestTenantID()
	repo := &mocks.CheckInRepository{}
	repo.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(&domaincheckin.CheckIn{
		ID:    id,
		OrgID: tenantID.UUID(),
	}, nil)

	uc := appcheckin.NewUpdateUseCase(repo, testutil.NewDiscardLogger())
	_, err := uc.Execute(context.Background(), appcheckin.UpdateCommand{
		OrgID:      tenantID,
		ID:         id,
		Value:      "50",
		Confidence: "excellent",
	})

	require.Error(t, err)
	repo.AssertNotCalled(t, "Update")
}
