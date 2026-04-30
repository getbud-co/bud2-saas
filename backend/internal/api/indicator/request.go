package indicator

import (
	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/api/httputil"
	appindicator "github.com/getbud-co/bud2/backend/internal/app/indicator"
	"github.com/getbud-co/bud2/backend/internal/domain"
)

type createRequest struct {
	MissionID       uuid.UUID  `json:"mission_id" validate:"required"`
	OwnerID         uuid.UUID  `json:"owner_id" validate:"required"`
	TeamID          *uuid.UUID `json:"team_id" validate:"omitempty"`
	Title           string     `json:"title" validate:"required,min=1,max=200"`
	Description     *string    `json:"description" validate:"omitempty,max=5000"`
	TargetValue     *float64   `json:"target_value"`
	CurrentValue    *float64   `json:"current_value"`
	Unit            *string    `json:"unit" validate:"omitempty,max=32"`
	Status          string     `json:"status" validate:"omitempty,oneof=draft active at_risk done archived"`
	DueDate         *string    `json:"due_date" validate:"omitempty,datetime=2006-01-02"`
	MeasurementMode string     `json:"measurement_mode" validate:"omitempty,oneof=manual survey task mission external"`
	GoalType        string     `json:"goal_type" validate:"omitempty,oneof=reach above below between survey"`
	LowThreshold    *float64   `json:"low_threshold"`
	HighThreshold   *float64   `json:"high_threshold"`
	PeriodStart     *string    `json:"period_start" validate:"omitempty,datetime=2006-01-02"`
	PeriodEnd       *string    `json:"period_end" validate:"omitempty,datetime=2006-01-02"`
	LinkedSurveyID  *uuid.UUID `json:"linked_survey_id" validate:"omitempty"`
}

// updateRequest models JSON Merge Patch (RFC 7396) semantics: every field is
// a pointer, only non-nil fields apply. mission_id is intentionally absent —
// moving an indicator between missions is not exposed via this endpoint.
type updateRequest struct {
	Title           *string    `json:"title" validate:"omitempty,min=1,max=200"`
	Description     *string    `json:"description" validate:"omitempty,max=5000"`
	OwnerID         *uuid.UUID `json:"owner_id" validate:"omitempty"`
	TeamID          *uuid.UUID `json:"team_id" validate:"omitempty"`
	TargetValue     *float64   `json:"target_value"`
	CurrentValue    *float64   `json:"current_value"`
	Unit            *string    `json:"unit" validate:"omitempty,max=32"`
	Status          *string    `json:"status" validate:"omitempty,oneof=draft active at_risk done archived"`
	DueDate         *string    `json:"due_date" validate:"omitempty,datetime=2006-01-02"`
	MeasurementMode *string    `json:"measurement_mode" validate:"omitempty,oneof=manual survey task mission external"`
	GoalType        *string    `json:"goal_type" validate:"omitempty,oneof=reach above below between survey"`
	LowThreshold    *float64   `json:"low_threshold"`
	HighThreshold   *float64   `json:"high_threshold"`
	PeriodStart     *string    `json:"period_start" validate:"omitempty,datetime=2006-01-02"`
	PeriodEnd       *string    `json:"period_end" validate:"omitempty,datetime=2006-01-02"`
	LinkedSurveyID  *uuid.UUID `json:"linked_survey_id" validate:"omitempty"`
}

func (r updateRequest) isEmpty() bool {
	return r.Title == nil && r.Description == nil && r.OwnerID == nil &&
		r.TeamID == nil && r.TargetValue == nil && r.CurrentValue == nil &&
		r.Unit == nil && r.Status == nil && r.DueDate == nil &&
		r.MeasurementMode == nil && r.GoalType == nil &&
		r.LowThreshold == nil && r.HighThreshold == nil &&
		r.PeriodStart == nil && r.PeriodEnd == nil && r.LinkedSurveyID == nil
}

var parseOptionalDate = httputil.ParseOptionalDate

func (r createRequest) toCommand(organizationID domain.TenantID) appindicator.CreateCommand {
	return appindicator.CreateCommand{
		OrganizationID:  organizationID,
		MissionID:       r.MissionID,
		OwnerID:         r.OwnerID,
		TeamID:          r.TeamID,
		Title:           r.Title,
		Description:     r.Description,
		TargetValue:     r.TargetValue,
		CurrentValue:    r.CurrentValue,
		Unit:            r.Unit,
		Status:          r.Status,
		DueDate:         parseOptionalDate(r.DueDate),
		MeasurementMode: r.MeasurementMode,
		GoalType:        r.GoalType,
		LowThreshold:    r.LowThreshold,
		HighThreshold:   r.HighThreshold,
		PeriodStart:     parseOptionalDate(r.PeriodStart),
		PeriodEnd:       parseOptionalDate(r.PeriodEnd),
		LinkedSurveyID:  r.LinkedSurveyID,
	}
}

func (r updateRequest) toCommand(organizationID domain.TenantID, id uuid.UUID) appindicator.UpdateCommand {
	return appindicator.UpdateCommand{
		OrganizationID:  organizationID,
		ID:              id,
		Title:           r.Title,
		Description:     r.Description,
		OwnerID:         r.OwnerID,
		TeamID:          r.TeamID,
		TargetValue:     r.TargetValue,
		CurrentValue:    r.CurrentValue,
		Unit:            r.Unit,
		Status:          r.Status,
		DueDate:         parseOptionalDate(r.DueDate),
		MeasurementMode: r.MeasurementMode,
		GoalType:        r.GoalType,
		LowThreshold:    r.LowThreshold,
		HighThreshold:   r.HighThreshold,
		PeriodStart:     parseOptionalDate(r.PeriodStart),
		PeriodEnd:       parseOptionalDate(r.PeriodEnd),
		LinkedSurveyID:  r.LinkedSurveyID,
	}
}
