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
	AssigneeID  uuid.UUID
	Title       string
	Description *string
	Status  Status
	DueDate *time.Time
	CompletedAt *time.Time
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

func (t *Task) Validate() error {
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
	return nil
}

type ListFilter struct {
	OrganizationID uuid.UUID
	MissionID      *uuid.UUID
	IndicatorID    *uuid.UUID
	AssigneeID     *uuid.UUID
	Status         *Status
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
