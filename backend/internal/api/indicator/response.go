package indicator

import (
	"time"

	"github.com/getbud-co/bud2/backend/internal/api/httputil"
	domainindicator "github.com/getbud-co/bud2/backend/internal/domain/indicator"
)

type Response struct {
	ID              string   `json:"id"`
	OrgID           string   `json:"org_id"`
	MissionID       string   `json:"mission_id"`
	OwnerID         string   `json:"owner_id"`
	TeamID          *string  `json:"team_id"`
	Title           string   `json:"title"`
	Description     *string  `json:"description"`
	TargetValue     *float64 `json:"target_value"`
	CurrentValue    *float64 `json:"current_value"`
	Unit            *string  `json:"unit"`
	Status          string   `json:"status"`
	DueDate         *string  `json:"due_date"`
	MeasurementMode string   `json:"measurement_mode"`
	GoalType        string   `json:"goal_type"`
	LowThreshold    *float64 `json:"low_threshold"`
	HighThreshold   *float64 `json:"high_threshold"`
	PeriodStart     *string  `json:"period_start"`
	PeriodEnd       *string  `json:"period_end"`
	LinkedSurveyID  *string  `json:"linked_survey_id"`
	CreatedAt       string   `json:"created_at"`
	UpdatedAt       string   `json:"updated_at"`
}

type ListResponse struct {
	Data  []Response `json:"data"`
	Total int64      `json:"total"`
	Page  int        `json:"page"`
	Size  int        `json:"size"`
}

func toResponse(i *domainindicator.Indicator) Response {
	var teamID *string
	if i.TeamID != nil {
		s := i.TeamID.String()
		teamID = &s
	}
	var linkedSurveyID *string
	if i.LinkedSurveyID != nil {
		s := i.LinkedSurveyID.String()
		linkedSurveyID = &s
	}
	return Response{
		ID:              i.ID.String(),
		OrgID:           i.OrganizationID.String(),
		MissionID:       i.MissionID.String(),
		OwnerID:         i.OwnerID.String(),
		TeamID:          teamID,
		Title:           i.Title,
		Description:     i.Description,
		TargetValue:     i.TargetValue,
		CurrentValue:    i.CurrentValue,
		Unit:            i.Unit,
		Status:          string(i.Status),
		DueDate:         formatOptionalDate(i.DueDate),
		MeasurementMode: string(i.MeasurementMode),
		GoalType:        string(i.GoalType),
		LowThreshold:    i.LowThreshold,
		HighThreshold:   i.HighThreshold,
		PeriodStart:     formatOptionalDate(i.PeriodStart),
		PeriodEnd:       formatOptionalDate(i.PeriodEnd),
		LinkedSurveyID:  linkedSurveyID,
		CreatedAt:       i.CreatedAt.Format(time.RFC3339),
		UpdatedAt:       i.UpdatedAt.Format(time.RFC3339),
	}
}

var formatOptionalDate = httputil.FormatOptionalDate
