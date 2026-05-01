package cycle

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
)

type Type string

const (
	TypeQuarterly  Type = "quarterly"
	TypeSemiAnnual Type = "semi_annual"
	TypeAnnual     Type = "annual"
	TypeCustom     Type = "custom"
)

func (t Type) IsValid() bool {
	switch t {
	case TypeQuarterly, TypeSemiAnnual, TypeAnnual, TypeCustom:
		return true
	}
	return false
}

type Status string

const (
	StatusPlanning Status = "planning"
	StatusActive   Status = "active"
	StatusReview   Status = "review"
	StatusEnded    Status = "ended"
	StatusArchived Status = "archived"
)

func (s Status) IsValid() bool {
	switch s {
	case StatusPlanning, StatusActive, StatusReview, StatusEnded, StatusArchived:
		return true
	}
	return false
}

type Cycle struct {
	ID                    uuid.UUID
	OrganizationID        uuid.UUID
	Name                  string
	Type                  Type
	StartDate             time.Time
	EndDate               time.Time
	Status                Status
	OKRDefinitionDeadline *time.Time
	MidReviewDate         *time.Time
	CreatedAt             time.Time
	UpdatedAt             time.Time
}

func (c *Cycle) validateInvariants() error {
	if c.Name == "" {
		return fmt.Errorf("%w: name is required", domain.ErrValidation)
	}
	if !c.Type.IsValid() {
		return fmt.Errorf("%w: type must be one of: quarterly, semi_annual, annual, custom", domain.ErrValidation)
	}
	if c.StartDate.IsZero() {
		return fmt.Errorf("%w: start_date is required", domain.ErrValidation)
	}
	if c.EndDate.IsZero() {
		return fmt.Errorf("%w: end_date is required", domain.ErrValidation)
	}
	if c.EndDate.Before(c.StartDate) {
		return fmt.Errorf("%w: end_date must be on or after start_date", domain.ErrValidation)
	}
	if !c.Status.IsValid() {
		return fmt.Errorf("%w: status must be one of: planning, active, review, ended, archived", domain.ErrValidation)
	}
	if c.OKRDefinitionDeadline != nil && (c.OKRDefinitionDeadline.Before(c.StartDate) || c.OKRDefinitionDeadline.After(c.EndDate)) {
		return fmt.Errorf("%w: okr_definition_deadline must be within the cycle period", domain.ErrValidation)
	}
	if c.MidReviewDate != nil && (c.MidReviewDate.Before(c.StartDate) || c.MidReviewDate.After(c.EndDate)) {
		return fmt.Errorf("%w: mid_review_date must be within the cycle period", domain.ErrValidation)
	}
	return nil
}

// Validate is the public invariant check used by repositories post-load and update use cases.
func (c *Cycle) Validate() error {
	return c.validateInvariants()
}

// CycleOption configures optional fields on a Cycle during construction.
type CycleOption func(*Cycle)

func WithOKRDefinitionDeadline(d *time.Time) CycleOption {
	return func(c *Cycle) { c.OKRDefinitionDeadline = d }
}

func WithMidReviewDate(d *time.Time) CycleOption {
	return func(c *Cycle) { c.MidReviewDate = d }
}

// NewCycle constructs an always-valid Cycle. Generates ID and enforces invariants before returning.
func NewCycle(
	orgID uuid.UUID,
	name string,
	t Type,
	startDate, endDate time.Time,
	status Status,
	opts ...CycleOption,
) (*Cycle, error) {
	c := &Cycle{
		ID:             uuid.New(),
		OrganizationID: orgID,
		Name:           name,
		Type:           t,
		StartDate:      startDate,
		EndDate:        endDate,
		Status:         status,
	}
	for _, opt := range opts {
		opt(c)
	}
	if err := c.validateInvariants(); err != nil {
		return nil, err
	}
	return c, nil
}

type ListResult struct {
	Cycles []Cycle
	Total  int64
}

type Repository interface {
	Create(ctx context.Context, cycle *Cycle) (*Cycle, error)
	GetByID(ctx context.Context, id, organizationID uuid.UUID) (*Cycle, error)
	GetByName(ctx context.Context, organizationID uuid.UUID, name string) (*Cycle, error)
	List(ctx context.Context, organizationID uuid.UUID, status *Status, page, size int) (ListResult, error)
	Update(ctx context.Context, cycle *Cycle) (*Cycle, error)
	SoftDelete(ctx context.Context, id, organizationID uuid.UUID) error
}

var (
	ErrNotFound   = errors.New("cycle not found")
	ErrNameExists = errors.New("cycle name already in use")
)
