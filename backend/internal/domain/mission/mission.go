package mission

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
	StatusDraft     Status = "draft"
	StatusActive    Status = "active"
	StatusPaused    Status = "paused"
	StatusCompleted Status = "completed"
	StatusCancelled Status = "cancelled"
)

func (s Status) IsValid() bool {
	switch s {
	case StatusDraft, StatusActive, StatusPaused, StatusCompleted, StatusCancelled:
		return true
	}
	return false
}

type Visibility string

const (
	VisibilityPublic   Visibility = "public"
	VisibilityTeamOnly Visibility = "team_only"
	VisibilityPrivate  Visibility = "private"
)

func (v Visibility) IsValid() bool {
	switch v {
	case VisibilityPublic, VisibilityTeamOnly, VisibilityPrivate:
		return true
	}
	return false
}

type KanbanStatus string

const (
	KanbanUncategorized KanbanStatus = "uncategorized"
	KanbanTodo          KanbanStatus = "todo"
	KanbanDoing         KanbanStatus = "doing"
	KanbanDone          KanbanStatus = "done"
)

func (k KanbanStatus) IsValid() bool {
	switch k {
	case KanbanUncategorized, KanbanTodo, KanbanDoing, KanbanDone:
		return true
	}
	return false
}

type Mission struct {
	ID             uuid.UUID
	OrganizationID uuid.UUID
	CycleID        *uuid.UUID
	ParentID       *uuid.UUID
	OwnerID        uuid.UUID
	TeamID         *uuid.UUID
	Title          string
	Description    *string
	Status         Status
	Visibility     Visibility
	KanbanStatus   KanbanStatus
	SortOrder      int
	DueDate        *time.Time
	CompletedAt    *time.Time
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

func (m *Mission) Validate() error {
	if m.Title == "" {
		return fmt.Errorf("%w: title is required", domain.ErrValidation)
	}
	if len(m.Title) > 200 {
		return fmt.Errorf("%w: title must be at most 200 characters", domain.ErrValidation)
	}
	if m.Description != nil && len(*m.Description) > 5000 {
		return fmt.Errorf("%w: description must be at most 5000 characters", domain.ErrValidation)
	}
	if !m.Status.IsValid() {
		return fmt.Errorf("%w: status must be one of: draft, active, paused, completed, cancelled", domain.ErrValidation)
	}
	if !m.Visibility.IsValid() {
		return fmt.Errorf("%w: visibility must be one of: public, team_only, private", domain.ErrValidation)
	}
	if !m.KanbanStatus.IsValid() {
		return fmt.Errorf("%w: kanban_status must be one of: uncategorized, todo, doing, done", domain.ErrValidation)
	}
	if m.CompletedAt != nil && m.Status != StatusCompleted {
		return fmt.Errorf("%w: completed_at is only allowed when status is 'completed'", domain.ErrValidation)
	}
	return nil
}

type ListFilter struct {
	OrganizationID uuid.UUID
	CycleID        *uuid.UUID
	ParentID       *uuid.UUID
	FilterByParent bool // true = filter by ParentID (nil means root only); false = no parent filter
	Status         *Status
	OwnerID        *uuid.UUID
	TeamID         *uuid.UUID
	Page           int
	Size           int
}

type ListResult struct {
	Missions []Mission
	Total    int64
	Page     int
	Size     int
}

type Repository interface {
	Create(ctx context.Context, mission *Mission) (*Mission, error)
	GetByID(ctx context.Context, id, organizationID uuid.UUID) (*Mission, error)
	List(ctx context.Context, filter ListFilter) (ListResult, error)
	IsDescendant(ctx context.Context, organizationID, ancestorID, candidateID uuid.UUID) (bool, error)
	Update(ctx context.Context, mission *Mission) (*Mission, error)
	SoftDeleteSubtree(ctx context.Context, id, organizationID uuid.UUID) error
}

var (
	ErrNotFound      = errors.New("mission not found")
	ErrInvalidParent = errors.New("invalid parent mission")
	// ErrInvalidReference indicates that cycle_id, team_id, or owner_id
	// references a resource that does not exist in the active tenant. Use case
	// layer validates this explicitly before persistence; repositories also
	// map FK violations (SQLSTATE 23503) to this error as a defense-in-depth.
	ErrInvalidReference = errors.New("invalid mission reference")
)
