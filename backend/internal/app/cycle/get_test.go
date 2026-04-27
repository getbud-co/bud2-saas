package cycle

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	domaincycle "github.com/getbud-co/bud2/backend/internal/domain/cycle"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func TestGetUseCase_Execute_Success(t *testing.T) {
	id := uuid.New()
	tenantID := fixtures.NewTestTenantID()
	expected := &domaincycle.Cycle{ID: id, OrganizationID: tenantID.UUID(), Name: "Q1"}
	repo := new(mocks.CycleRepository)
	repo.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(expected, nil)

	uc := NewGetUseCase(repo, testutil.NewDiscardLogger())
	got, err := uc.Execute(context.Background(), tenantID, id)

	require.NoError(t, err)
	assert.Equal(t, expected, got)
	repo.AssertExpectations(t)
}

func TestGetUseCase_Execute_NotFound_PropagatesError(t *testing.T) {
	repo := new(mocks.CycleRepository)
	repo.On("GetByID", mock.Anything, mock.Anything, mock.Anything).Return(nil, domaincycle.ErrNotFound)

	uc := NewGetUseCase(repo, testutil.NewDiscardLogger())
	_, err := uc.Execute(context.Background(), fixtures.NewTestTenantID(), uuid.New())

	assert.ErrorIs(t, err, domaincycle.ErrNotFound)
}
