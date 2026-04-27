package cycle

import (
	"context"
	"errors"
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

func TestDeleteUseCase_Execute_Success(t *testing.T) {
	id := uuid.New()
	tenantID := fixtures.NewTestTenantID()
	repo := new(mocks.CycleRepository)
	repo.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(&domaincycle.Cycle{ID: id}, nil)
	repo.On("SoftDelete", mock.Anything, id, tenantID.UUID()).Return(nil)

	uc := NewDeleteUseCase(repo, testutil.NewDiscardLogger())
	err := uc.Execute(context.Background(), DeleteCommand{OrganizationID: tenantID, ID: id})

	require.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestDeleteUseCase_Execute_NotFound_PropagatesError(t *testing.T) {
	repo := new(mocks.CycleRepository)
	repo.On("GetByID", mock.Anything, mock.Anything, mock.Anything).Return(nil, domaincycle.ErrNotFound)

	uc := NewDeleteUseCase(repo, testutil.NewDiscardLogger())
	err := uc.Execute(context.Background(), DeleteCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		ID:             uuid.New(),
	})

	assert.ErrorIs(t, err, domaincycle.ErrNotFound)
	repo.AssertNotCalled(t, "SoftDelete")
}

func TestDeleteUseCase_Execute_SoftDeleteError_Propagated(t *testing.T) {
	repoErr := errors.New("delete failed")
	repo := new(mocks.CycleRepository)
	repo.On("GetByID", mock.Anything, mock.Anything, mock.Anything).Return(&domaincycle.Cycle{}, nil)
	repo.On("SoftDelete", mock.Anything, mock.Anything, mock.Anything).Return(repoErr)

	uc := NewDeleteUseCase(repo, testutil.NewDiscardLogger())
	err := uc.Execute(context.Background(), DeleteCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		ID:             uuid.New(),
	})

	assert.ErrorIs(t, err, repoErr)
}
