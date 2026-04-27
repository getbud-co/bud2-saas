package cycle

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	domaincycle "github.com/getbud-co/bud2/backend/internal/domain/cycle"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func TestListUseCase_Execute_AppliesDefaults(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	repo := new(mocks.CycleRepository)
	repo.On("List", mock.Anything, tenantID.UUID(), (*domaincycle.Status)(nil), 1, 20).Return(domaincycle.ListResult{}, nil)

	uc := NewListUseCase(repo, testutil.NewDiscardLogger())
	_, err := uc.Execute(context.Background(), ListCommand{OrganizationID: tenantID})

	assert.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestListUseCase_Execute_ClampsSizeToMax100(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	repo := new(mocks.CycleRepository)
	repo.On("List", mock.Anything, tenantID.UUID(), (*domaincycle.Status)(nil), 1, 100).Return(domaincycle.ListResult{}, nil)

	uc := NewListUseCase(repo, testutil.NewDiscardLogger())
	_, err := uc.Execute(context.Background(), ListCommand{OrganizationID: tenantID, Page: 0, Size: 500})

	assert.NoError(t, err)
}

func TestListUseCase_Execute_ForwardsStatusFilter(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	repo := new(mocks.CycleRepository)
	repo.On("List", mock.Anything, tenantID.UUID(), mock.MatchedBy(func(s *domaincycle.Status) bool {
		return s != nil && *s == domaincycle.StatusActive
	}), 1, 20).Return(domaincycle.ListResult{}, nil)

	uc := NewListUseCase(repo, testutil.NewDiscardLogger())
	status := "active"
	_, err := uc.Execute(context.Background(), ListCommand{OrganizationID: tenantID, Status: &status})

	assert.NoError(t, err)
}
