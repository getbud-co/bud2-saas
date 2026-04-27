package mission

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	domainmission "github.com/getbud-co/bud2/backend/internal/domain/mission"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func TestDeleteUseCase_Execute_NotFound_IsIdempotent(t *testing.T) {
	repo := new(mocks.MissionRepository)
	repo.On("GetByID", mock.Anything, mock.Anything, mock.Anything).Return(nil, domainmission.ErrNotFound)

	uc := NewDeleteUseCase(repo, testutil.NewDiscardLogger())
	err := uc.Execute(context.Background(), DeleteCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		ID:             uuid.New(),
	})

	assert.NoError(t, err)
	repo.AssertNotCalled(t, "SoftDeleteSubtree")
}

func TestDeleteUseCase_Execute_Success_CallsSoftDeleteSubtree(t *testing.T) {
	id := uuid.New()
	tenantID := fixtures.NewTestTenantID()
	repo := new(mocks.MissionRepository)
	repo.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(&domainmission.Mission{ID: id}, nil)
	repo.On("SoftDeleteSubtree", mock.Anything, id, tenantID.UUID()).Return(nil)

	uc := NewDeleteUseCase(repo, testutil.NewDiscardLogger())
	err := uc.Execute(context.Background(), DeleteCommand{OrganizationID: tenantID, ID: id})

	require.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestDeleteUseCase_Execute_GetError_Propagated(t *testing.T) {
	customErr := errors.New("db down")
	repo := new(mocks.MissionRepository)
	repo.On("GetByID", mock.Anything, mock.Anything, mock.Anything).Return(nil, customErr)

	uc := NewDeleteUseCase(repo, testutil.NewDiscardLogger())
	err := uc.Execute(context.Background(), DeleteCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		ID:             uuid.New(),
	})

	assert.ErrorIs(t, err, customErr)
	repo.AssertNotCalled(t, "SoftDeleteSubtree")
}

func TestDeleteUseCase_Execute_SoftDeleteError_Propagated(t *testing.T) {
	repoErr := errors.New("delete failed")
	repo := new(mocks.MissionRepository)
	repo.On("GetByID", mock.Anything, mock.Anything, mock.Anything).Return(&domainmission.Mission{}, nil)
	repo.On("SoftDeleteSubtree", mock.Anything, mock.Anything, mock.Anything).Return(repoErr)

	uc := NewDeleteUseCase(repo, testutil.NewDiscardLogger())
	err := uc.Execute(context.Background(), DeleteCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		ID:             uuid.New(),
	})

	assert.ErrorIs(t, err, repoErr)
}
