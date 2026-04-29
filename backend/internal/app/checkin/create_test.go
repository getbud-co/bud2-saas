package checkin_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	appcheckin "github.com/getbud-co/bud2/backend/internal/app/checkin"
	"github.com/getbud-co/bud2/backend/internal/domain"
	domaincheckin "github.com/getbud-co/bud2/backend/internal/domain/checkin"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func TestCreateUseCase_Execute(t *testing.T) {
	orgID := domain.TenantID(uuid.New())
	indicatorID := uuid.New()
	authorID := uuid.New()

	t.Run("creates check-in and persists", func(t *testing.T) {
		repo := &mocks.CheckInRepository{}
		repo.On("Create", context.Background(), mock.MatchedBy(func(c *domaincheckin.CheckIn) bool {
			return c.OrgID == orgID.UUID() &&
				c.IndicatorID == indicatorID &&
				c.AuthorID == authorID &&
				c.Value == "75" &&
				c.Confidence == domaincheckin.ConfidenceHigh &&
				c.ID != uuid.Nil
		})).Return(&domaincheckin.CheckIn{
			ID:          uuid.New(),
			OrgID:       orgID.UUID(),
			IndicatorID: indicatorID,
			AuthorID:    authorID,
			Value:       "75",
			Confidence:  domaincheckin.ConfidenceHigh,
			Mentions:    []string{},
		}, nil).Once()

		uc := appcheckin.NewCreateUseCase(repo, testutil.NewDiscardLogger())
		result, err := uc.Execute(context.Background(), appcheckin.CreateCommand{
			OrgID:       orgID,
			IndicatorID: indicatorID,
			AuthorID:    authorID,
			Value:       "75",
			Confidence:  "high",
		})

		require.NoError(t, err)
		assert.NotEqual(t, uuid.Nil, result.ID)
		repo.AssertExpectations(t)
	})

	t.Run("returns validation error for empty value", func(t *testing.T) {
		repo := &mocks.CheckInRepository{}
		uc := appcheckin.NewCreateUseCase(repo, testutil.NewDiscardLogger())
		_, err := uc.Execute(context.Background(), appcheckin.CreateCommand{
			OrgID:       orgID,
			IndicatorID: indicatorID,
			AuthorID:    authorID,
			Value:       "",
			Confidence:  "high",
		})
		require.Error(t, err)
		repo.AssertNotCalled(t, "Create")
	})

	t.Run("returns validation error for invalid confidence", func(t *testing.T) {
		repo := &mocks.CheckInRepository{}
		uc := appcheckin.NewCreateUseCase(repo, testutil.NewDiscardLogger())
		_, err := uc.Execute(context.Background(), appcheckin.CreateCommand{
			OrgID:       orgID,
			IndicatorID: indicatorID,
			AuthorID:    authorID,
			Value:       "50",
			Confidence:  "excellent",
		})
		require.Error(t, err)
		repo.AssertNotCalled(t, "Create")
	})
}
