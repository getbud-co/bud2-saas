package task

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	domaintask "github.com/getbud-co/bud2/backend/internal/domain/task"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func TestDeleteUseCase_Execute_HappyPath(t *testing.T) {
	repo := new(mocks.TaskRepository)
	id := uuid.New()
	repo.On("GetByID", mock.Anything, id, mock.Anything).Return(&domaintask.Task{ID: id}, nil)
	repo.On("SoftDelete", mock.Anything, id, mock.Anything).Return(nil)

	err := NewDeleteUseCase(repo, testutil.NewDiscardLogger()).Execute(context.Background(), DeleteCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		ID:             id,
	})
	require.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestDeleteUseCase_Execute_AlreadyDeleted_IsIdempotent(t *testing.T) {
	repo := new(mocks.TaskRepository)
	repo.On("GetByID", mock.Anything, mock.Anything, mock.Anything).Return(nil, domaintask.ErrNotFound)

	err := NewDeleteUseCase(repo, testutil.NewDiscardLogger()).Execute(context.Background(), DeleteCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		ID:             uuid.New(),
	})
	require.NoError(t, err)
	repo.AssertNotCalled(t, "SoftDelete")
}
