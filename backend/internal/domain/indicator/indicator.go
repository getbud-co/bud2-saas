package indicator

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
	StatusDraft    Status = "draft"
	StatusActive   Status = "active"
	StatusAtRisk   Status = "at_risk"
	StatusDone     Status = "done"
	StatusArchived Status = "archived"
)

func (s Status) IsValid() bool {
	switch s {
	case StatusDraft, StatusActive, StatusAtRisk, StatusDone, StatusArchived:
		return true
	}
	return false
}

type Indicator struct {
	ID             uuid.UUID
	OrganizationID uuid.UUID
	MissionID      uuid.UUID
	OwnerID        uuid.UUID
	Title          string
	Description    *string
	TargetValue    *float64
	CurrentValue   *float64
	Unit           *string
	Status  Status
	DueDate *time.Time
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

func (i *Indicator) Validate() error {
	if i.Title == "" {
		return fmt.Errorf("%w: title is required", domain.ErrValidation)
	}
	if len(i.Title) > 200 {
		return fmt.Errorf("%w: title must be at most 200 characters", domain.ErrValidation)
	}
	if i.Description != nil && len(*i.Description) > 5000 {
		return fmt.Errorf("%w: description must be at most 5000 characters", domain.ErrValidation)
	}
	if i.Unit != nil && len(*i.Unit) > 32 {
		return fmt.Errorf("%w: unit must be at most 32 characters", domain.ErrValidation)
	}
	if !i.Status.IsValid() {
		return fmt.Errorf("%w: status must be one of: draft, active, at_risk, done, archived", domain.ErrValidation)
	}
	return nil
}

type ListFilter struct {
	OrganizationID uuid.UUID
	MissionID      *uuid.UUID
	OwnerID        *uuid.UUID
	Status         *Status
	Page           int
	Size           int
}

type ListResult struct {
	Indicators []Indicator
	Total      int64
	Page       int
	Size       int
}

type Repository interface {
	Create(ctx context.Context, indicator *Indicator) (*Indicator, error)
	GetByID(ctx context.Context, id, organizationID uuid.UUID) (*Indicator, error)
	List(ctx context.Context, filter ListFilter) (ListResult, error)
	Update(ctx context.Context, indicator *Indicator) (*Indicator, error)
	SoftDelete(ctx context.Context, id, organizationID uuid.UUID) error
}

var (
	ErrNotFound = errors.New("indicator not found")
	// ErrInvalidReference indicates that mission_id or owner_id references a
	// resource that does not exist in the active tenant. Use case validates
	// this explicitly before persistence; repositories also map FK violations
	// (SQLSTATE 23503) to this error as a defense-in-depth.
	ErrInvalidReference = errors.New("invalid indicator reference")
)
