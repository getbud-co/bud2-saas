package cycle

import (
	"context"
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

func TestUpdateUseCase_Execute_Success(t *testing.T) {
	id := uuid.New()
	tenantID := fixtures.NewTestTenantID()
	existing := &domaincycle.Cycle{
		ID: id, OrganizationID: tenantID.UUID(),
		Name: "Old", Type: domaincycle.TypeQuarterly,
		StartDate: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		EndDate:   time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC),
		Status:    domaincycle.StatusPlanning,
	}
	updated := &domaincycle.Cycle{ID: id, Name: "New", Status: domaincycle.StatusActive}

	repo := new(mocks.CycleRepository)
	repo.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(existing, nil)
	repo.On("GetByName", mock.Anything, tenantID.UUID(), "New").Return(nil, domaincycle.ErrNotFound)
	repo.On("Update", mock.Anything, mock.MatchedBy(func(c *domaincycle.Cycle) bool {
		return c.Name == "New" && c.Status == domaincycle.StatusActive
	})).Return(updated, nil)

	uc := NewUpdateUseCase(repo, testutil.NewDiscardLogger())
	got, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID, ID: id,
		Name: "New", Type: "quarterly",
		StartDate: existing.StartDate, EndDate: existing.EndDate,
		Status: "active",
	})

	require.NoError(t, err)
	assert.Equal(t, updated, got)
	repo.AssertExpectations(t)
}

func TestUpdateUseCase_Execute_NameUnchanged_SkipsDuplicateCheck(t *testing.T) {
	id := uuid.New()
	tenantID := fixtures.NewTestTenantID()
	existing := &domaincycle.Cycle{
		ID: id, OrganizationID: tenantID.UUID(),
		Name: "Same", Type: domaincycle.TypeQuarterly,
		StartDate: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		EndDate:   time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC),
		Status:    domaincycle.StatusPlanning,
	}
	repo := new(mocks.CycleRepository)
	repo.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(existing, nil)
	repo.On("Update", mock.Anything, mock.Anything).Return(existing, nil)

	uc := NewUpdateUseCase(repo, testutil.NewDiscardLogger())
	_, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID, ID: id,
		Name: "Same", Type: "quarterly",
		StartDate: existing.StartDate, EndDate: existing.EndDate,
		Status: "active",
	})

	require.NoError(t, err)
	repo.AssertNotCalled(t, "GetByName")
}

func TestUpdateUseCase_Execute_NotFound_PropagatesError(t *testing.T) {
	repo := new(mocks.CycleRepository)
	repo.On("GetByID", mock.Anything, mock.Anything, mock.Anything).Return(nil, domaincycle.ErrNotFound)

	uc := NewUpdateUseCase(repo, testutil.NewDiscardLogger())
	_, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: fixtures.NewTestTenantID(), ID: uuid.New(),
		Name: "x", Type: "quarterly",
		StartDate: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		EndDate:   time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC),
		Status:    "active",
	})

	assert.ErrorIs(t, err, domaincycle.ErrNotFound)
	repo.AssertNotCalled(t, "Update")
}

func TestUpdateUseCase_Execute_NewNameAlreadyTaken_ReturnsConflict(t *testing.T) {
	id := uuid.New()
	tenantID := fixtures.NewTestTenantID()
	existing := &domaincycle.Cycle{
		ID: id, OrganizationID: tenantID.UUID(),
		Name: "Old", Type: domaincycle.TypeQuarterly,
		StartDate: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		EndDate:   time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC),
		Status:    domaincycle.StatusPlanning,
	}
	repo := new(mocks.CycleRepository)
	repo.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(existing, nil)
	repo.On("GetByName", mock.Anything, tenantID.UUID(), "Taken").Return(&domaincycle.Cycle{ID: uuid.New()}, nil)

	uc := NewUpdateUseCase(repo, testutil.NewDiscardLogger())
	_, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID, ID: id,
		Name: "Taken", Type: "quarterly",
		StartDate: existing.StartDate, EndDate: existing.EndDate,
		Status: "active",
	})

	assert.ErrorIs(t, err, domaincycle.ErrNameExists)
	repo.AssertNotCalled(t, "Update")
}
