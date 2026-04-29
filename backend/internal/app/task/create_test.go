package task

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domainmission "github.com/getbud-co/bud2/backend/internal/domain/mission"
	domaintask "github.com/getbud-co/bud2/backend/internal/domain/task"
	domainuser "github.com/getbud-co/bud2/backend/internal/domain/user"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

type taskDeps struct {
	tasks      *mocks.TaskRepository
	missions   *mocks.MissionRepository
	indicators *mocks.IndicatorRepository
	teams      *mocks.TeamRepository
	users      *mocks.UserRepository
}

func newTaskDeps() taskDeps {
	return taskDeps{
		tasks:      new(mocks.TaskRepository),
		missions:   new(mocks.MissionRepository),
		indicators: new(mocks.IndicatorRepository),
		teams:      new(mocks.TeamRepository),
		users:      new(mocks.UserRepository),
	}
}

func (d taskDeps) allowMission() taskDeps {
	d.missions.On("GetByID", mock.Anything, mock.Anything, mock.Anything).
		Return(&domainmission.Mission{ID: uuid.New()}, nil)
	return d
}

func (d taskDeps) allowAssignee() taskDeps {
	d.users.On("GetActiveMemberByID", mock.Anything, mock.Anything, mock.Anything).
		Return(&domainuser.User{ID: uuid.New()}, nil)
	return d
}

func (d taskDeps) newCreateUseCase() *CreateUseCase {
	return NewCreateUseCase(d.tasks, d.missions, d.indicators, d.teams, d.users, testutil.NewDiscardLogger())
}

func validCmd() CreateCommand {
	return CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		MissionID:      uuid.New(),
		AssigneeID:     uuid.New(),
		Title:          "Pesquisar churn drivers",
	}
}

func TestCreateUseCase_Execute_Success_AppliesDefaults(t *testing.T) {
	d := newTaskDeps().allowMission().allowAssignee()
	d.tasks.On("Create", mock.Anything, mock.MatchedBy(func(tk *domaintask.Task) bool {
		return tk.Status == domaintask.StatusTodo
	})).Return(&domaintask.Task{ID: uuid.New(), Title: "x", Status: domaintask.StatusTodo}, nil)

	created, err := d.newCreateUseCase().Execute(context.Background(), validCmd())
	require.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, created.ID)
	d.tasks.AssertExpectations(t)
}

func TestCreateUseCase_Execute_MissionInDifferentOrg_ReturnsInvalidReference(t *testing.T) {
	d := newTaskDeps()
	d.missions.On("GetByID", mock.Anything, mock.Anything, mock.Anything).Return(nil, domainmission.ErrNotFound)

	_, err := d.newCreateUseCase().Execute(context.Background(), validCmd())
	assert.ErrorIs(t, err, domaintask.ErrInvalidReference)
	d.tasks.AssertNotCalled(t, "Create")
}

func TestCreateUseCase_Execute_AssigneeNotActiveMember_ReturnsInvalidReference(t *testing.T) {
	d := newTaskDeps().allowMission()
	d.users.On("GetActiveMemberByID", mock.Anything, mock.Anything, mock.Anything).Return(nil, domainuser.ErrNotFound)

	_, err := d.newCreateUseCase().Execute(context.Background(), validCmd())
	assert.ErrorIs(t, err, domaintask.ErrInvalidReference)
	d.tasks.AssertNotCalled(t, "Create")
}

func TestCreateUseCase_Execute_EmptyTitle_ReturnsValidationError(t *testing.T) {
	d := newTaskDeps().allowMission().allowAssignee()

	cmd := validCmd()
	cmd.Title = ""
	_, err := d.newCreateUseCase().Execute(context.Background(), cmd)
	assert.ErrorIs(t, err, domain.ErrValidation)
	d.tasks.AssertNotCalled(t, "Create")
}

func TestCreateUseCase_Execute_RepoError_PropagatesError(t *testing.T) {
	repoErr := errors.New("db down")
	d := newTaskDeps().allowMission().allowAssignee()
	d.tasks.On("Create", mock.Anything, mock.Anything).Return(nil, repoErr)

	_, err := d.newCreateUseCase().Execute(context.Background(), validCmd())
	assert.ErrorIs(t, err, repoErr)
}

func TestCreateUseCase_Execute_ParentTaskNotFound_ReturnsInvalidReference(t *testing.T) {
	d := newTaskDeps().allowMission().allowAssignee()
	d.tasks.On("GetByID", mock.Anything, mock.Anything, mock.Anything).Return(nil, domaintask.ErrNotFound)

	parentID := uuid.New()
	cmd := validCmd()
	cmd.ParentTaskID = &parentID
	_, err := d.newCreateUseCase().Execute(context.Background(), cmd)
	assert.ErrorIs(t, err, domaintask.ErrInvalidReference)
	d.tasks.AssertNotCalled(t, "Create")
}

func TestCreateUseCase_Execute_ParentTaskIsSubtask_ReturnsInvalidReference(t *testing.T) {
	missionID := uuid.New()
	grandparentID := uuid.New()
	d := newTaskDeps().allowAssignee()
	d.missions.On("GetByID", mock.Anything, missionID, mock.Anything).Return(&domainmission.Mission{ID: missionID}, nil)
	// The parent task itself has a parent — depth would exceed 1.
	d.tasks.On("GetByID", mock.Anything, mock.Anything, mock.Anything).Return(&domaintask.Task{
		ID:           uuid.New(),
		MissionID:    missionID,
		ParentTaskID: &grandparentID,
	}, nil)

	parentID := uuid.New()
	cmd := validCmd()
	cmd.MissionID = missionID
	cmd.ParentTaskID = &parentID
	_, err := d.newCreateUseCase().Execute(context.Background(), cmd)
	assert.ErrorIs(t, err, domaintask.ErrInvalidReference)
	d.tasks.AssertNotCalled(t, "Create")
}

func TestCreateUseCase_Execute_ParentTaskDifferentMission_ReturnsInvalidReference(t *testing.T) {
	missionID := uuid.New()
	d := newTaskDeps().allowAssignee()
	d.missions.On("GetByID", mock.Anything, missionID, mock.Anything).Return(&domainmission.Mission{ID: missionID}, nil)
	// Parent task belongs to a different mission.
	d.tasks.On("GetByID", mock.Anything, mock.Anything, mock.Anything).Return(&domaintask.Task{
		ID:        uuid.New(),
		MissionID: uuid.New(),
	}, nil)

	parentID := uuid.New()
	cmd := validCmd()
	cmd.MissionID = missionID
	cmd.ParentTaskID = &parentID
	_, err := d.newCreateUseCase().Execute(context.Background(), cmd)
	assert.ErrorIs(t, err, domaintask.ErrInvalidReference)
	d.tasks.AssertNotCalled(t, "Create")
}
