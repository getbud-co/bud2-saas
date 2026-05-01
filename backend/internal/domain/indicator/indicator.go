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

type MeasurementMode string

const (
	MeasurementModeManual   MeasurementMode = "manual"
	MeasurementModeSurvey   MeasurementMode = "survey"
	MeasurementModeTask     MeasurementMode = "task"
	MeasurementModeMission  MeasurementMode = "mission"
	MeasurementModeExternal MeasurementMode = "external"
)

func (m MeasurementMode) IsValid() bool {
	switch m {
	case MeasurementModeManual, MeasurementModeSurvey, MeasurementModeTask, MeasurementModeMission, MeasurementModeExternal:
		return true
	}
	return false
}

type GoalType string

const (
	GoalTypeReach   GoalType = "reach"
	GoalTypeAbove   GoalType = "above"
	GoalTypeBelow   GoalType = "below"
	GoalTypeBetween GoalType = "between"
	GoalTypeSurvey  GoalType = "survey"
)

func (g GoalType) IsValid() bool {
	switch g {
	case GoalTypeReach, GoalTypeAbove, GoalTypeBelow, GoalTypeBetween, GoalTypeSurvey:
		return true
	}
	return false
}

type Indicator struct {
	ID              uuid.UUID
	OrganizationID  uuid.UUID
	MissionID       uuid.UUID
	OwnerID         uuid.UUID
	TeamID          *uuid.UUID
	Title           string
	Description     *string
	TargetValue     *float64
	CurrentValue    *float64
	Unit            *string
	Status          Status
	DueDate         *time.Time
	MeasurementMode MeasurementMode
	GoalType        GoalType
	LowThreshold    *float64
	HighThreshold   *float64
	PeriodStart     *time.Time
	PeriodEnd       *time.Time
	LinkedSurveyID  *uuid.UUID
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

func (i *Indicator) validateInvariants() error {
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
	if i.MeasurementMode != "" && !i.MeasurementMode.IsValid() {
		return fmt.Errorf("%w: measurement_mode must be one of: manual, survey, task, mission, external", domain.ErrValidation)
	}
	if i.GoalType != "" && !i.GoalType.IsValid() {
		return fmt.Errorf("%w: goal_type must be one of: reach, above, below, between, survey", domain.ErrValidation)
	}
	if i.LowThreshold != nil && i.HighThreshold != nil && *i.LowThreshold > *i.HighThreshold {
		return fmt.Errorf("%w: low_threshold must be ≤ high_threshold", domain.ErrValidation)
	}
	if i.PeriodStart != nil && i.PeriodEnd != nil && i.PeriodStart.After(*i.PeriodEnd) {
		return fmt.Errorf("%w: period_start must be ≤ period_end", domain.ErrValidation)
	}
	return nil
}

// Validate is the public invariant check used by update use cases that mutate
// fields after construction. New aggregates are created via NewIndicator.
func (i *Indicator) Validate() error {
	return i.validateInvariants()
}

// IndicatorOption configures optional fields on an Indicator during construction.
type IndicatorOption func(*Indicator)

func WithDescription(d *string) IndicatorOption      { return func(i *Indicator) { i.Description = d } }
func WithTargetValue(v *float64) IndicatorOption     { return func(i *Indicator) { i.TargetValue = v } }
func WithCurrentValue(v *float64) IndicatorOption    { return func(i *Indicator) { i.CurrentValue = v } }
func WithUnit(u *string) IndicatorOption             { return func(i *Indicator) { i.Unit = u } }
func WithStatus(s Status) IndicatorOption            { return func(i *Indicator) { i.Status = s } }
func WithDueDate(d *time.Time) IndicatorOption       { return func(i *Indicator) { i.DueDate = d } }
func WithMeasurementMode(m MeasurementMode) IndicatorOption {
	return func(i *Indicator) { i.MeasurementMode = m }
}
func WithGoalType(g GoalType) IndicatorOption { return func(i *Indicator) { i.GoalType = g } }

// NewIndicator constructs an always-valid Indicator. Generates ID, applies
// default status (StatusDraft), and enforces invariants before returning.
func NewIndicator(
	orgID, missionID, ownerID uuid.UUID,
	title string,
	opts ...IndicatorOption,
) (*Indicator, error) {
	i := &Indicator{
		ID:             uuid.New(),
		OrganizationID: orgID,
		MissionID:      missionID,
		OwnerID:        ownerID,
		Title:          title,
		Status:         StatusDraft,
	}
	for _, opt := range opts {
		opt(i)
	}
	if err := i.validateInvariants(); err != nil {
		return nil, err
	}
	return i, nil
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
