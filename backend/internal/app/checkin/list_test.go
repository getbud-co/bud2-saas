package checkin_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	appcheckin "github.com/getbud-co/bud2/backend/internal/app/checkin"
	domaincheckin "github.com/getbud-co/bud2/backend/internal/domain/checkin"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func TestListUseCase_Execute_AppliesDefaults(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	indicatorID := uuid.New()
	repo := &mocks.CheckInRepository{}
	repo.On("ListByIndicator", mock.Anything, tenantID.UUID(), indicatorID, 1, 50).
		Return(domaincheckin.ListResult{}, nil)

	uc := appcheckin.NewListUseCase(repo, testutil.NewDiscardLogger())
	_, err := uc.Execute(context.Background(), appcheckin.ListCommand{
		OrgID:       tenantID,
		IndicatorID: indicatorID,
	})

	assert.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestListUseCase_Execute_ForwardsIndicatorAndPaging(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	indicatorID := uuid.New()
	repo := &mocks.CheckInRepository{}
	repo.On("ListByIndicator", mock.Anything, tenantID.UUID(), indicatorID, 2, 10).
		Return(domaincheckin.ListResult{Total: 5, Page: 2, Size: 10}, nil)

	uc := appcheckin.NewListUseCase(repo, testutil.NewDiscardLogger())
	result, err := uc.Execute(context.Background(), appcheckin.ListCommand{
		OrgID:       tenantID,
		IndicatorID: indicatorID,
		Page:        2,
		Size:        10,
	})

	assert.NoError(t, err)
	assert.Equal(t, int64(5), result.Total)
	repo.AssertExpectations(t)
}
