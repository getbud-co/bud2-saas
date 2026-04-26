package cycle

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	domaincycle "github.com/getbud-co/bud2/backend/internal/domain/cycle"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func TestCreateUseCase_Execute_Success(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	start := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC)
	created := &domaincycle.Cycle{ID: uuid.New(), Name: "Q1 2026"}

	repo := new(mocks.CycleRepository)
	repo.On("GetByName", mock.Anything, tenantID.UUID(), "Q1 2026").Return(nil, domaincycle.ErrNotFound)
	repo.On("Create", mock.Anything, mock.MatchedBy(func(c *domaincycle.Cycle) bool {
		return c.Name == "Q1 2026" && c.Type == domaincycle.TypeQuarterly
	})).Return(created, nil)

	uc := NewCreateUseCase(repo, testutil.NewDiscardLogger())
	result, err := uc.Execute(context.Background(), CreateCommand{
		OrganizationID: tenantID,
		Name:           "Q1 2026",
		Type:           "quarterly",
		StartDate:      start,
		EndDate:        end,
		Status:         "planning",
	})

	require.NoError(t, err)
	assert.Equal(t, created, result)
	repo.AssertExpectations(t)
}

func TestCreateUseCase_Execute_DuplicateName_ReturnsConflict(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	repo := new(mocks.CycleRepository)
	repo.On("GetByName", mock.Anything, tenantID.UUID(), "Q1 2026").Return(&domaincycle.Cycle{ID: uuid.New()}, nil)

	uc := NewCreateUseCase(repo, testutil.NewDiscardLogger())
	_, err := uc.Execute(context.Background(), CreateCommand{
		OrganizationID: tenantID,
		Name:           "Q1 2026",
		Type:           "quarterly",
		StartDate:      time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		EndDate:        time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC),
		Status:         "planning",
	})

	assert.ErrorIs(t, err, domaincycle.ErrNameExists)
	repo.AssertNotCalled(t, "Create")
}

func TestCreateUseCase_Execute_GetByNameError_Propagated(t *testing.T) {
	repoErr := errors.New("db down")
	repo := new(mocks.CycleRepository)
	repo.On("GetByName", mock.Anything, mock.Anything, mock.Anything).Return(nil, repoErr)

	uc := NewCreateUseCase(repo, testutil.NewDiscardLogger())
	_, err := uc.Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		Name:           "x",
		Type:           "quarterly",
		StartDate:      time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		EndDate:        time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC),
		Status:         "planning",
	})

	assert.ErrorIs(t, err, repoErr)
}

func TestCreateUseCase_Execute_InvalidStatus_ReturnsValidationError(t *testing.T) {
	repo := new(mocks.CycleRepository)
	repo.On("GetByName", mock.Anything, mock.Anything, mock.Anything).Return(nil, domaincycle.ErrNotFound)

	uc := NewCreateUseCase(repo, testutil.NewDiscardLogger())
	_, err := uc.Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		Name:           "x",
		Type:           "quarterly",
		StartDate:      time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		EndDate:        time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC),
		Status:         "bogus",
	})

	assert.Error(t, err)
	repo.AssertNotCalled(t, "Create")
}
