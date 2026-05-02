package checkin

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
)

type Confidence string

const (
	ConfidenceHigh          Confidence = "high"
	ConfidenceMedium        Confidence = "medium"
	ConfidenceLow           Confidence = "low"
	ConfidenceBarrier       Confidence = "barrier"
	ConfidenceDeprioritized Confidence = "deprioritized"
)

func (c Confidence) IsValid() bool {
	switch c {
	case ConfidenceHigh, ConfidenceMedium, ConfidenceLow, ConfidenceBarrier, ConfidenceDeprioritized:
		return true
	}
	return false
}

type CheckIn struct {
	ID            uuid.UUID
	OrgID         uuid.UUID
	IndicatorID   uuid.UUID
	AuthorID      uuid.UUID
	Value         string
	PreviousValue *string
	Confidence    Confidence
	Note          *string
	Mentions      []string
	CreatedAt     time.Time
	UpdatedAt     time.Time
	AuthorName    *AuthorName
}

type AuthorName struct {
	FirstName string
	LastName  string
}

func (c *CheckIn) validateInvariants() error {
	if c.Value == "" {
		return fmt.Errorf("%w: value is required", domain.ErrValidation)
	}
	if !c.Confidence.IsValid() {
		return fmt.Errorf("%w: confidence must be one of: high, medium, low, barrier, deprioritized", domain.ErrValidation)
	}
	return nil
}

// Validate is the public invariant check used by repositories post-load.
// New aggregates are created via NewCheckIn.
func (c *CheckIn) Validate() error {
	return c.validateInvariants()
}

// UpdateContent mutates value, confidence, note, and mentions atomically.
// A nil mentions slice is normalised to an empty slice. Returns an error and
// leaves the aggregate unchanged if the new state would violate invariants.
func (c *CheckIn) UpdateContent(value string, confidence Confidence, note *string, mentions []string) error {
	next := *c
	next.Value = value
	next.Confidence = confidence
	next.Note = note
	if mentions == nil {
		next.Mentions = []string{}
	} else {
		next.Mentions = mentions
	}
	if err := next.validateInvariants(); err != nil {
		return err
	}
	c.Value = next.Value
	c.Confidence = next.Confidence
	c.Note = next.Note
	c.Mentions = next.Mentions
	return nil
}

// CheckInOption configures optional fields on a CheckIn during construction.
type CheckInOption func(*CheckIn)

func WithPreviousValue(v *string) CheckInOption { return func(c *CheckIn) { c.PreviousValue = v } }
func WithNote(n *string) CheckInOption          { return func(c *CheckIn) { c.Note = n } }
func WithMentions(m []string) CheckInOption {
	return func(c *CheckIn) {
		if m == nil {
			m = []string{}
		}
		c.Mentions = m
	}
}

// NewCheckIn constructs an always-valid CheckIn. Generates ID and enforces
// invariants before returning.
func NewCheckIn(
	orgID, indicatorID, authorID uuid.UUID,
	value string,
	confidence Confidence,
	opts ...CheckInOption,
) (*CheckIn, error) {
	c := &CheckIn{
		ID:          uuid.New(),
		OrgID:       orgID,
		IndicatorID: indicatorID,
		AuthorID:    authorID,
		Value:       value,
		Confidence:  confidence,
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
	CheckIns []CheckIn
	Total    int64
	Page     int
	Size     int
}

type Repository interface {
	Create(ctx context.Context, c *CheckIn) (*CheckIn, error)
	GetByID(ctx context.Context, id, orgID uuid.UUID) (*CheckIn, error)
	ListByIndicator(ctx context.Context, orgID, indicatorID uuid.UUID, page, size int) (ListResult, error)
	Update(ctx context.Context, c *CheckIn) (*CheckIn, error)
	SoftDelete(ctx context.Context, id, orgID uuid.UUID) error
}

var ErrNotFound = errors.New("check-in not found")
