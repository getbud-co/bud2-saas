package task

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	domaintask "github.com/getbud-co/bud2/backend/internal/domain/task"
	domainuser "github.com/getbud-co/bud2/backend/internal/domain/user"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func TestUpdateUseCase_Execute_TransitionToDone_AutoFillsCompletedAt(t *testing.T) {
	repo := new(mocks.TaskRepository)
	users := new(mocks.UserRepository)
	existing := &domaintask.Task{
		ID:     uuid.New(),
		Title:  "x",
		Status: domaintask.StatusInProgress,
	}
	repo.On("GetByID", mock.Anything, mock.Anything, mock.Anything).Return(existing, nil)
	repo.On("Update", mock.Anything, mock.MatchedBy(func(tk *domaintask.Task) bool {
		return tk.Status == domaintask.StatusDone && tk.CompletedAt != nil
	})).Return(existing, nil)

	doneStatus := string(domaintask.StatusDone)
	_, err := NewUpdateUseCase(repo, new(mocks.IndicatorRepository), new(mocks.TeamRepository), users, testutil.NewDiscardLogger()).Execute(context.Background(), UpdateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		ID:             existing.ID,
		Status:         &doneStatus,
	})
	require.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestUpdateUseCase_Execute_TransitionOutOfDone_ClearsCompletedAt(t *testing.T) {
	repo := new(mocks.TaskRepository)
	users := new(mocks.UserRepository)
	now := time.Now()
	existing := &domaintask.Task{
		ID:          uuid.New(),
		Title:       "x",
		Status:      domaintask.StatusDone,
		CompletedAt: &now,
	}
	repo.On("GetByID", mock.Anything, mock.Anything, mock.Anything).Return(existing, nil)
	repo.On("Update", mock.Anything, mock.MatchedBy(func(tk *domaintask.Task) bool {
		return tk.Status == domaintask.StatusInProgress && tk.CompletedAt == nil
	})).Return(existing, nil)

	inProgress := string(domaintask.StatusInProgress)
	_, err := NewUpdateUseCase(repo, new(mocks.IndicatorRepository), new(mocks.TeamRepository), users, testutil.NewDiscardLogger()).Execute(context.Background(), UpdateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		ID:             existing.ID,
		Status:         &inProgress,
	})
	require.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestUpdateUseCase_Execute_AssigneeChange_NotMember_ReturnsInvalidReference(t *testing.T) {
	repo := new(mocks.TaskRepository)
	users := new(mocks.UserRepository)
	existing := &domaintask.Task{ID: uuid.New(), Title: "x", AssigneeID: uuid.New(), Status: domaintask.StatusTodo}
	repo.On("GetByID", mock.Anything, mock.Anything, mock.Anything).Return(existing, nil)
	users.On("GetActiveMemberByID", mock.Anything, mock.Anything, mock.Anything).Return(nil, domainuser.ErrNotFound)

	newAssignee := uuid.New()
	_, err := NewUpdateUseCase(repo, new(mocks.IndicatorRepository), new(mocks.TeamRepository), users, testutil.NewDiscardLogger()).Execute(context.Background(), UpdateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		ID:             existing.ID,
		AssigneeID:     &newAssignee,
	})
	assert.ErrorIs(t, err, domaintask.ErrInvalidReference)
	repo.AssertNotCalled(t, "Update")
}
