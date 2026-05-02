package task

import (
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/getbud-co/bud2/backend/internal/domain"
)

func TestStatus_IsValid(t *testing.T) {
	for _, s := range []Status{StatusTodo, StatusInProgress, StatusDone, StatusCancelled} {
		assert.Truef(t, s.IsValid(), "%q should be valid", s)
	}
	assert.False(t, Status("nope").IsValid())
}

func TestTask_Validate_RejectsEmptyTitle(t *testing.T) {
	tk := newValid()
	tk.Title = ""
	assert.ErrorIs(t, tk.Validate(), domain.ErrValidation)
}

func TestTask_Validate_RejectsLongTitle(t *testing.T) {
	tk := newValid()
	tk.Title = strings.Repeat("a", 201)
	assert.ErrorIs(t, tk.Validate(), domain.ErrValidation)
}

func TestTask_Validate_RejectsCompletedAtWithoutDoneStatus(t *testing.T) {
	tk := newValid()
	now := time.Now()
	tk.CompletedAt = &now
	tk.Status = StatusInProgress
	assert.ErrorIs(t, tk.Validate(), domain.ErrValidation)
}

func TestTask_Validate_RejectsSelfReference(t *testing.T) {
	tk := newValid()
	tk.ParentTaskID = &tk.ID
	assert.ErrorIs(t, tk.Validate(), domain.ErrValidation)
}

func TestTask_Validate_AcceptsValidTask(t *testing.T) {
	assert.NoError(t, newValid().Validate())
}

func newValid() *Task {
	return &Task{
		ID:             uuid.New(),
		OrganizationID: uuid.New(),
		MissionID:      uuid.New(),
		AssigneeID:     uuid.New(),
		Title:          "Pesquisar churn drivers",
		Status:         StatusTodo,
	}
}

func TestNewTask_AppliesDefaultStatus(t *testing.T) {
	orgID := uuid.New()
	missionID := uuid.New()
	assigneeID := uuid.New()
	tk, err := NewTask(orgID, missionID, assigneeID, "Pesquisar churn drivers")
	require.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, tk.ID)
	assert.Equal(t, StatusTodo, tk.Status)
	assert.Equal(t, orgID, tk.OrganizationID)
	assert.Equal(t, missionID, tk.MissionID)
	assert.Equal(t, assigneeID, tk.AssigneeID)
}

func TestNewTask_WithStatus_OverridesDefault(t *testing.T) {
	tk, err := NewTask(uuid.New(), uuid.New(), uuid.New(), "T", WithStatus(StatusInProgress))
	require.NoError(t, err)
	assert.Equal(t, StatusInProgress, tk.Status)
}

func TestNewTask_WithIndicator_SetsIndicatorID(t *testing.T) {
	indicatorID := uuid.New()
	tk, err := NewTask(uuid.New(), uuid.New(), uuid.New(), "T", WithIndicator(indicatorID))
	require.NoError(t, err)
	require.NotNil(t, tk.IndicatorID)
	assert.Equal(t, indicatorID, *tk.IndicatorID)
}

func TestNewTask_EmptyTitle_ReturnsValidationError(t *testing.T) {
	_, err := NewTask(uuid.New(), uuid.New(), uuid.New(), "")
	assert.ErrorIs(t, err, domain.ErrValidation)
}

func TestNewTask_IDIsAlwaysGenerated(t *testing.T) {
	t1, _ := NewTask(uuid.New(), uuid.New(), uuid.New(), "A")
	t2, _ := NewTask(uuid.New(), uuid.New(), uuid.New(), "B")
	assert.NotEqual(t, uuid.Nil, t1.ID)
	assert.NotEqual(t, t1.ID, t2.ID)
}

func TestNewTask_WithTeam_SetsTeamID(t *testing.T) {
	teamID := uuid.New()
	tk, err := NewTask(uuid.New(), uuid.New(), uuid.New(), "T", WithTeam(teamID))
	require.NoError(t, err)
	require.NotNil(t, tk.TeamID)
	assert.Equal(t, teamID, *tk.TeamID)
}

func TestNewTask_WithContributesToMissions_NilNormalized(t *testing.T) {
	tk, err := NewTask(uuid.New(), uuid.New(), uuid.New(), "T", WithContributesToMissions(nil))
	require.NoError(t, err)
	assert.NotNil(t, tk.ContributesToMissionIDs)
	assert.Empty(t, tk.ContributesToMissionIDs)
}

func TestNewTask_WithContributesToMissions_PreservesIDs(t *testing.T) {
	ids := []uuid.UUID{uuid.New(), uuid.New()}
	tk, err := NewTask(uuid.New(), uuid.New(), uuid.New(), "T", WithContributesToMissions(ids))
	require.NoError(t, err)
	assert.Equal(t, ids, tk.ContributesToMissionIDs)
}

func TestTask_ChangeStatus_TransitionsToDone_SetsCompletedAt(t *testing.T) {
	tk := newValid()
	require.Nil(t, tk.CompletedAt)
	require.NoError(t, tk.ChangeStatus(StatusDone))
	assert.Equal(t, StatusDone, tk.Status)
	assert.NotNil(t, tk.CompletedAt)
}

func TestTask_ChangeStatus_TransitionFromDone_ClearsCompletedAt(t *testing.T) {
	tk := newValid()
	require.NoError(t, tk.ChangeStatus(StatusDone))
	require.NoError(t, tk.ChangeStatus(StatusInProgress))
	assert.Equal(t, StatusInProgress, tk.Status)
	assert.Nil(t, tk.CompletedAt)
}

func TestTask_ChangeStatus_InvalidStatus_ReturnsError(t *testing.T) {
	tk := newValid()
	assert.ErrorIs(t, tk.ChangeStatus(Status("invalid")), domain.ErrValidation)
	assert.Equal(t, StatusTodo, tk.Status)
}

func TestTask_Rename_Valid_ChangesTitle(t *testing.T) {
	tk := newValid()
	require.NoError(t, tk.Rename("new title"))
	assert.Equal(t, "new title", tk.Title)
}

func TestTask_Rename_EmptyTitle_ReturnsErrorDoesNotMutate(t *testing.T) {
	tk := newValid()
	original := tk.Title
	assert.ErrorIs(t, tk.Rename(""), domain.ErrValidation)
	assert.Equal(t, original, tk.Title)
}

func TestTask_ChangeDescription_Valid_ChangesDescription(t *testing.T) {
	tk := newValid()
	desc := "new description"
	require.NoError(t, tk.ChangeDescription(&desc))
	require.NotNil(t, tk.Description)
	assert.Equal(t, desc, *tk.Description)
}

func TestTask_ChangeDescription_Nil_ClearsDescription(t *testing.T) {
	tk := newValid()
	desc := "initial"
	tk.Description = &desc
	require.NoError(t, tk.ChangeDescription(nil))
	assert.Nil(t, tk.Description)
}

func TestTask_ChangeAssignee_Valid_ChangesAssigneeID(t *testing.T) {
	tk := newValid()
	newAssignee := uuid.New()
	require.NoError(t, tk.ChangeAssignee(newAssignee))
	assert.Equal(t, newAssignee, tk.AssigneeID)
}

func TestTask_ChangeIndicator_Valid_SetsIndicator(t *testing.T) {
	tk := newValid()
	indicatorID := uuid.New()
	require.NoError(t, tk.ChangeIndicator(&indicatorID))
	require.NotNil(t, tk.IndicatorID)
	assert.Equal(t, indicatorID, *tk.IndicatorID)
}

func TestTask_ChangeTeam_Valid_SetsTeam(t *testing.T) {
	tk := newValid()
	teamID := uuid.New()
	require.NoError(t, tk.ChangeTeam(&teamID))
	require.NotNil(t, tk.TeamID)
	assert.Equal(t, teamID, *tk.TeamID)
}

func TestTask_ReplaceContributesToMissionIDs_NilNormalizesToEmpty(t *testing.T) {
	tk := newValid()
	require.NoError(t, tk.ReplaceContributesToMissionIDs(nil))
	assert.NotNil(t, tk.ContributesToMissionIDs)
	assert.Empty(t, tk.ContributesToMissionIDs)
}

func TestTask_ReplaceContributesToMissionIDs_ReplacesSlice(t *testing.T) {
	tk := newValid()
	ids := []uuid.UUID{uuid.New(), uuid.New()}
	require.NoError(t, tk.ReplaceContributesToMissionIDs(ids))
	assert.Equal(t, ids, tk.ContributesToMissionIDs)
}

func TestTask_ChangeDueDate_SetAndClear(t *testing.T) {
	tk := newValid()
	due := time.Now().Add(24 * time.Hour)
	require.NoError(t, tk.ChangeDueDate(&due))
	require.NotNil(t, tk.DueDate)
	require.NoError(t, tk.ChangeDueDate(nil))
	assert.Nil(t, tk.DueDate)
}
