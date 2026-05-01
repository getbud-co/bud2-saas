package task

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
)

type Status string

const (
	StatusTodo       Status = "todo"
	StatusInProgress Status = "in_progress"
	StatusDone       Status = "done"
	StatusCancelled  Status = "cancelled"
)

func (s Status) IsValid() bool {
	switch s {
	case StatusTodo, StatusInProgress, StatusDone, StatusCancelled:
		return true
	}
	return false
}

type Task struct {
	ID             uuid.UUID
	OrganizationID uuid.UUID
	MissionID      uuid.UUID
	// IndicatorID is set when the task lives under one of the mission's
	// indicators (the UI nests it visually inside the indicator card);
	// nil when the task is at the mission level. mission_id is set
	// either way — the indicator parent is purely a UI affordance.
	IndicatorID *uuid.UUID
	// ParentTaskID links a subtask to its parent. Depth is capped at 1:
	// a task whose ParentTaskID is set must not itself be the parent of
	// another task. Self-referencing is also rejected.
	ParentTaskID            *uuid.UUID
	TeamID                  *uuid.UUID
	ContributesToMissionIDs []uuid.UUID
	AssigneeID              uuid.UUID
	Title                   string
	Description             *string
	Status                  Status
	DueDate                 *time.Time
	CompletedAt             *time.Time
	CreatedAt               time.Time
	UpdatedAt               time.Time
}

func (t *Task) validateInvariants() error {
	if t.Title == "" {
		return fmt.Errorf("%w: title is required", domain.ErrValidation)
	}
	if len(t.Title) > 200 {
		return fmt.Errorf("%w: title must be at most 200 characters", domain.ErrValidation)
	}
	if t.Description != nil && len(*t.Description) > 5000 {
		return fmt.Errorf("%w: description must be at most 5000 characters", domain.ErrValidation)
	}
	if !t.Status.IsValid() {
		return fmt.Errorf("%w: status must be one of: todo, in_progress, done, cancelled", domain.ErrValidation)
	}
	if t.CompletedAt != nil && t.Status != StatusDone {
		return fmt.Errorf("%w: completed_at is only allowed when status is 'done'", domain.ErrValidation)
	}
	if t.ParentTaskID != nil && *t.ParentTaskID == t.ID {
		return fmt.Errorf("%w: task cannot be its own parent", domain.ErrValidation)
	}
	return nil
}

// Validate is the public invariant check used by update use cases that mutate
// fields after construction. New aggregates are created via NewTask.
func (t *Task) Validate() error {
	return t.validateInvariants()
}

// TaskOption configures optional fields on a Task during construction.
type TaskOption func(*Task)

func WithDescription(d *string) TaskOption   { return func(t *Task) { t.Description = d } }
func WithStatus(s Status) TaskOption         { return func(t *Task) { t.Status = s } }
func WithDueDate(d *time.Time) TaskOption    { return func(t *Task) { t.DueDate = d } }
func WithIndicator(id uuid.UUID) TaskOption  { return func(t *Task) { t.IndicatorID = &id } }
func WithParentTask(id uuid.UUID) TaskOption { return func(t *Task) { t.ParentTaskID = &id } }

// NewTask constructs an always-valid Task. Generates ID, applies default
// status (StatusTodo), and enforces invariants before returning.
func NewTask(
	orgID, missionID, assigneeID uuid.UUID,
	title string,
	opts ...TaskOption,
) (*Task, error) {
	t := &Task{
		ID:             uuid.New(),
		OrganizationID: orgID,
		MissionID:      missionID,
		AssigneeID:     assigneeID,
		Title:          title,
		Status:         StatusTodo,
	}
	for _, opt := range opts {
		opt(t)
	}
	if err := t.validateInvariants(); err != nil {
		return nil, err
	}
	return t, nil
}

type ListFilter struct {
	OrganizationID uuid.UUID
	MissionID      *uuid.UUID
	IndicatorID    *uuid.UUID
	AssigneeID     *uuid.UUID
	Status         *Status
	ParentTaskID   *uuid.UUID
	Page           int
	Size           int
}

type ListResult struct {
	Tasks []Task
	Total int64
	Page  int
	Size  int
}

type Repository interface {
	Create(ctx context.Context, task *Task) (*Task, error)
	GetByID(ctx context.Context, id, organizationID uuid.UUID) (*Task, error)
	List(ctx context.Context, filter ListFilter) (ListResult, error)
	Update(ctx context.Context, task *Task) (*Task, error)
	SoftDelete(ctx context.Context, id, organizationID uuid.UUID) error
}

var (
	ErrNotFound = errors.New("task not found")
	// ErrInvalidReference indicates that mission_id or assignee_id references
	// a resource that does not exist in the active tenant. Use case validates
	// this explicitly before persistence; repositories also map FK violations
	// (SQLSTATE 23503) to this error as a defense-in-depth.
	ErrInvalidReference = errors.New("invalid task reference")
)
