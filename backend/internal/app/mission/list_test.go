package mission

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	domainmission "github.com/getbud-co/bud2/backend/internal/domain/mission"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func TestListUseCase_Execute_ClampsSizeToMax100(t *testing.T) {
	repo := new(mocks.MissionRepository)
	repo.On("List", mock.Anything, mock.MatchedBy(func(f domainmission.ListFilter) bool {
		return f.Size == 100 && f.Page == 1
	})).Return(domainmission.ListResult{}, nil)

	uc := NewListUseCase(repo, testutil.NewDiscardLogger())
	_, err := uc.Execute(context.Background(), ListCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		Page:           0,
		Size:           500,
	})

	assert.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestListUseCase_Execute_AppliesDefaults(t *testing.T) {
	repo := new(mocks.MissionRepository)
	repo.On("List", mock.Anything, mock.MatchedBy(func(f domainmission.ListFilter) bool {
		return f.Size == 20 && f.Page == 1
	})).Return(domainmission.ListResult{}, nil)

	uc := NewListUseCase(repo, testutil.NewDiscardLogger())
	_, err := uc.Execute(context.Background(), ListCommand{
		OrganizationID: fixtures.NewTestTenantID(),
	})

	assert.NoError(t, err)
}

func TestListUseCase_Execute_FilterByParent_RootOnly_PassesNilParentAndFlag(t *testing.T) {
	repo := new(mocks.MissionRepository)
	repo.On("List", mock.Anything, mock.MatchedBy(func(f domainmission.ListFilter) bool {
		return f.FilterByParent && f.ParentID == nil
	})).Return(domainmission.ListResult{}, nil)

	uc := NewListUseCase(repo, testutil.NewDiscardLogger())
	_, err := uc.Execute(context.Background(), ListCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		FilterByParent: true,
		ParentID:       nil,
	})

	assert.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestListUseCase_Execute_FilterByParent_SpecificParent_PassesUUID(t *testing.T) {
	parentID := uuid.New()
	repo := new(mocks.MissionRepository)
	repo.On("List", mock.Anything, mock.MatchedBy(func(f domainmission.ListFilter) bool {
		return f.FilterByParent && f.ParentID != nil && *f.ParentID == parentID
	})).Return(domainmission.ListResult{}, nil)

	uc := NewListUseCase(repo, testutil.NewDiscardLogger())
	_, err := uc.Execute(context.Background(), ListCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		FilterByParent: true,
		ParentID:       &parentID,
	})

	assert.NoError(t, err)
}

func TestListUseCase_Execute_StatusFilter_PropagatedAsTypedStatus(t *testing.T) {
	repo := new(mocks.MissionRepository)
	repo.On("List", mock.Anything, mock.MatchedBy(func(f domainmission.ListFilter) bool {
		return f.Status != nil && *f.Status == domainmission.StatusActive
	})).Return(domainmission.ListResult{}, nil)

	uc := NewListUseCase(repo, testutil.NewDiscardLogger())
	status := "active"
	_, err := uc.Execute(context.Background(), ListCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		Status:         &status,
	})

	assert.NoError(t, err)
}

func TestListUseCase_Execute_AllUUIDFilters_Propagated(t *testing.T) {
	cycleID := uuid.New()
	ownerID := uuid.New()
	teamID := uuid.New()
	repo := new(mocks.MissionRepository)
	repo.On("List", mock.Anything, mock.MatchedBy(func(f domainmission.ListFilter) bool {
		return f.CycleID != nil && *f.CycleID == cycleID &&
			f.OwnerID != nil && *f.OwnerID == ownerID &&
			f.TeamID != nil && *f.TeamID == teamID
	})).Return(domainmission.ListResult{}, nil)

	uc := NewListUseCase(repo, testutil.NewDiscardLogger())
	_, err := uc.Execute(context.Background(), ListCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		CycleID:        &cycleID,
		OwnerID:        &ownerID,
		TeamID:         &teamID,
	})

	assert.NoError(t, err)
}
