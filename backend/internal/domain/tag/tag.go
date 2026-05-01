package tag

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
)

type Color string

const (
	ColorNeutral Color = "neutral"
	ColorOrange  Color = "orange"
	ColorWine    Color = "wine"
	ColorCaramel Color = "caramel"
	ColorSuccess Color = "success"
	ColorWarning Color = "warning"
	ColorError   Color = "error"
)

func (c Color) IsValid() bool {
	switch c {
	case ColorNeutral, ColorOrange, ColorWine, ColorCaramel, ColorSuccess, ColorWarning, ColorError:
		return true
	}
	return false
}

type Tag struct {
	ID             uuid.UUID
	OrganizationID uuid.UUID
	Name           string
	Color          Color
	UsageCount     int64
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

func (t *Tag) validateInvariants() error {
	if t.Name == "" {
		return fmt.Errorf("%w: name is required", domain.ErrValidation)
	}
	if len(t.Name) > 100 {
		return fmt.Errorf("%w: name must be at most 100 characters", domain.ErrValidation)
	}
	if !t.Color.IsValid() {
		return fmt.Errorf("%w: color must be one of: neutral, orange, wine, caramel, success, warning, error", domain.ErrValidation)
	}
	return nil
}

// Validate is the public invariant check used by repositories post-load.
// New aggregates are created via NewTag.
func (t *Tag) Validate() error {
	return t.validateInvariants()
}

// NewTag constructs an always-valid Tag. Generates ID and enforces invariants
// before returning.
func NewTag(orgID uuid.UUID, name string, color Color) (*Tag, error) {
	t := &Tag{
		ID:             uuid.New(),
		OrganizationID: orgID,
		Name:           name,
		Color:          color,
	}
	if err := t.validateInvariants(); err != nil {
		return nil, err
	}
	return t, nil
}

// Rename changes the tag's name and re-validates invariants.
func (t *Tag) Rename(name string) error {
	next := *t
	next.Name = name
	if err := next.validateInvariants(); err != nil {
		return err
	}
	t.Name = name
	return nil
}

// ChangeColor changes the tag's color and re-validates invariants.
func (t *Tag) ChangeColor(color Color) error {
	next := *t
	next.Color = color
	if err := next.validateInvariants(); err != nil {
		return err
	}
	t.Color = color
	return nil
}

type ListResult struct {
	Tags  []Tag
	Total int64
}

type Repository interface {
	Create(ctx context.Context, tag *Tag) (*Tag, error)
	GetByID(ctx context.Context, id, organizationID uuid.UUID) (*Tag, error)
	GetByName(ctx context.Context, organizationID uuid.UUID, name string) (*Tag, error)
	List(ctx context.Context, organizationID uuid.UUID, page, size int) (ListResult, error)
	Update(ctx context.Context, tag *Tag) (*Tag, error)
	SoftDelete(ctx context.Context, id, organizationID uuid.UUID) error
}

var (
	ErrNotFound   = errors.New("tag not found")
	ErrNameExists = errors.New("tag name already in use")
)
