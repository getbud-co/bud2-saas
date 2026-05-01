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
