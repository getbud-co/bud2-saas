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

func (c *CheckIn) Validate() error {
	if c.Value == "" {
		return fmt.Errorf("%w: value is required", domain.ErrValidation)
	}
	if !c.Confidence.IsValid() {
		return fmt.Errorf("%w: confidence must be one of: high, medium, low, barrier, deprioritized", domain.ErrValidation)
	}
	return nil
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
