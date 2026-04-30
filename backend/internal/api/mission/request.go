package mission

import (
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/api/httputil"
	appmission "github.com/getbud-co/bud2/backend/internal/app/mission"
	"github.com/getbud-co/bud2/backend/internal/domain"
)

type memberInline struct {
	UserID uuid.UUID `json:"user_id" validate:"required"`
	Role   string    `json:"role"    validate:"omitempty,oneof=owner supporter observer"`
}

type createRequest struct {
	Title        string                  `json:"title" validate:"required,min=1,max=200"`
	Description  *string                 `json:"description" validate:"omitempty,max=5000"`
	ParentID     *uuid.UUID              `json:"parent_id" validate:"omitempty"`
	OwnerID      uuid.UUID               `json:"owner_id" validate:"required"`
	TeamID       *uuid.UUID              `json:"team_id" validate:"omitempty"`
	Status       string                  `json:"status" validate:"omitempty,oneof=draft active paused completed cancelled"`
	Visibility   string                  `json:"visibility" validate:"omitempty,oneof=public team_only private"`
	KanbanStatus string                  `json:"kanban_status" validate:"omitempty,oneof=uncategorized todo doing done"`
	StartDate    string                  `json:"start_date" validate:"required,datetime=2006-01-02"`
	EndDate      string                  `json:"end_date" validate:"required,datetime=2006-01-02"`
	Members      []memberInline          `json:"members" validate:"omitempty,dive"`
	TagIDs       []uuid.UUID             `json:"tag_ids" validate:"omitempty"`
	Indicators   []createIndicatorInline `json:"indicators" validate:"omitempty,dive"`
	Tasks        []createTaskInline      `json:"tasks" validate:"omitempty,dive"`
}

// createIndicatorInline mirrors CreateIndicatorRequest minus mission_id, which
// is supplied by the parent mission. owner_id is optional and defaults to the
// mission owner.
type createIndicatorInline struct {
	OwnerID      *uuid.UUID `json:"owner_id" validate:"omitempty"`
	Title        string     `json:"title" validate:"required,min=1,max=200"`
	Description  *string    `json:"description" validate:"omitempty,max=5000"`
	TargetValue  *float64   `json:"target_value"`
	CurrentValue *float64   `json:"current_value"`
	Unit         *string    `json:"unit" validate:"omitempty,max=32"`
	Status       string     `json:"status" validate:"omitempty,oneof=draft active at_risk done archived"`
	DueDate      *string    `json:"due_date" validate:"omitempty,datetime=2006-01-02"`
}

// createTaskInline mirrors CreateTaskRequest minus mission_id. assignee_id is
// optional and defaults to the mission owner. indicator_index references one
// of the inline indicators by its position in the request body so a task
// can be nested under an indicator that is being created in the same call;
// indicator_id can be set instead when the task is being attached to an
// indicator that already exists. Exactly one (or neither) is expected.
type createTaskInline struct {
	AssigneeID     *uuid.UUID `json:"assignee_id" validate:"omitempty"`
	IndicatorID    *uuid.UUID `json:"indicator_id" validate:"omitempty"`
	IndicatorIndex *int       `json:"indicator_index" validate:"omitempty,min=0"`
	Title          string     `json:"title" validate:"required,min=1,max=200"`
	Description    *string    `json:"description" validate:"omitempty,max=5000"`
	Status         string     `json:"status" validate:"omitempty,oneof=todo in_progress done cancelled"`
	DueDate        *string    `json:"due_date" validate:"omitempty,datetime=2006-01-02"`
}

// updateRequest models JSON Merge Patch (RFC 7396) semantics: every field is
// a pointer, and only non-nil fields are applied to the existing mission.
// Absent (nil) fields preserve their current value. `parent_id` is
// intentionally absent — reparent is not exposed via this endpoint.
//
// Limitation: with single pointers we cannot distinguish "field omitted"
// from "field explicitly null". Sending null on a nullable field does NOT
// clear it. If clearing is needed in the future, switch to **T or a Wrapper.
type updateRequest struct {
	Title        *string         `json:"title" validate:"omitempty,min=1,max=200"`
	Description  *string         `json:"description" validate:"omitempty,max=5000"`
	OwnerID      *uuid.UUID      `json:"owner_id" validate:"omitempty"`
	TeamID       *uuid.UUID      `json:"team_id" validate:"omitempty"`
	Status       *string         `json:"status" validate:"omitempty,oneof=draft active paused completed cancelled"`
	Visibility   *string         `json:"visibility" validate:"omitempty,oneof=public team_only private"`
	KanbanStatus *string         `json:"kanban_status" validate:"omitempty,oneof=uncategorized todo doing done"`
	StartDate    *string         `json:"start_date" validate:"omitempty,datetime=2006-01-02"`
	EndDate      *string         `json:"end_date" validate:"omitempty,datetime=2006-01-02"`
	Members      *[]memberInline `json:"members" validate:"omitempty,dive"`
	TagIDs       *[]uuid.UUID    `json:"tag_ids" validate:"omitempty"`
}

// isEmpty reports whether the patch body carries no actionable field. The
// handler rejects empty patches with 400 — a no-op PATCH is almost always a
// client bug.
func (r updateRequest) isEmpty() bool {
	return r.Title == nil && r.Description == nil &&
		r.OwnerID == nil && r.TeamID == nil && r.Status == nil &&
		r.Visibility == nil && r.KanbanStatus == nil &&
		r.StartDate == nil && r.EndDate == nil && r.Members == nil &&
		r.TagIDs == nil
}

var parseOptionalDate = httputil.ParseOptionalDate

func (r createRequest) toCommand(organizationID domain.TenantID) (appmission.CreateCommand, error) {
	// Dates are required and already validated by the validator tag; parse
	// errors here indicate programmer error, not user input error.
	startDate, err := time.Parse(httputil.DateLayout, r.StartDate)
	if err != nil {
		return appmission.CreateCommand{}, fmt.Errorf("invalid start_date: %w", err)
	}
	endDate, err := time.Parse(httputil.DateLayout, r.EndDate)
	if err != nil {
		return appmission.CreateCommand{}, fmt.Errorf("invalid end_date: %w", err)
	}

	cmd := appmission.CreateCommand{
		OrganizationID: organizationID,
		Title:          r.Title,
		Description:    r.Description,
		ParentID:       r.ParentID,
		OwnerID:        r.OwnerID,
		TeamID:         r.TeamID,
		Status:         r.Status,
		Visibility:     r.Visibility,
		KanbanStatus:   r.KanbanStatus,
		StartDate:      startDate,
		EndDate:        endDate,
		TagIDs:         r.TagIDs,
	}
	if len(r.Members) > 0 {
		cmd.Members = make([]appmission.MemberInput, len(r.Members))
		for i, m := range r.Members {
			cmd.Members[i] = appmission.MemberInput{UserID: m.UserID, Role: m.Role}
		}
	}
	if len(r.Indicators) > 0 {
		cmd.Indicators = make([]appmission.CreateIndicatorInput, len(r.Indicators))
		for i, in := range r.Indicators {
			cmd.Indicators[i] = appmission.CreateIndicatorInput{
				OwnerID:      in.OwnerID,
				Title:        in.Title,
				Description:  in.Description,
				TargetValue:  in.TargetValue,
				CurrentValue: in.CurrentValue,
				Unit:         in.Unit,
				Status:       in.Status,
				DueDate:      parseOptionalDate(in.DueDate),
			}
		}
	}
	if len(r.Tasks) > 0 {
		cmd.Tasks = make([]appmission.CreateTaskInput, len(r.Tasks))
		for i, tk := range r.Tasks {
			cmd.Tasks[i] = appmission.CreateTaskInput{
				AssigneeID:     tk.AssigneeID,
				IndicatorID:    tk.IndicatorID,
				IndicatorIndex: tk.IndicatorIndex,
				Title:          tk.Title,
				Description:    tk.Description,
				Status:         tk.Status,
				DueDate:        parseOptionalDate(tk.DueDate),
			}
		}
	}
	return cmd, nil
}

func (r updateRequest) toCommand(organizationID domain.TenantID, id uuid.UUID) appmission.UpdateCommand {
	cmd := appmission.UpdateCommand{
		OrganizationID: organizationID,
		ID:             id,
		Title:          r.Title,
		Description:    r.Description,
		OwnerID:        r.OwnerID,
		TeamID:         r.TeamID,
		Status:         r.Status,
		Visibility:     r.Visibility,
		KanbanStatus:   r.KanbanStatus,
		StartDate:      parseOptionalDate(r.StartDate),
		EndDate:        parseOptionalDate(r.EndDate),
		TagIDs:         r.TagIDs,
	}
	if r.Members != nil {
		inputs := make([]appmission.MemberInput, len(*r.Members))
		for i, m := range *r.Members {
			inputs[i] = appmission.MemberInput{UserID: m.UserID, Role: m.Role}
		}
		cmd.Members = &inputs
	}
	return cmd
}
