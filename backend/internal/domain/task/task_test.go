package task

import (
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"

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
