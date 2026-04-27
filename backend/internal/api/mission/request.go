package mission

import (
	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/api/httputil"
	appmission "github.com/getbud-co/bud2/backend/internal/app/mission"
	"github.com/getbud-co/bud2/backend/internal/domain"
)

type createRequest struct {
	Title        string                  `json:"title" validate:"required,min=1,max=200"`
	Description  *string                 `json:"description" validate:"omitempty,max=5000"`
	CycleID      *uuid.UUID              `json:"cycle_id" validate:"omitempty"`
	ParentID     *uuid.UUID              `json:"parent_id" validate:"omitempty"`
	OwnerID      uuid.UUID               `json:"owner_id" validate:"required"`
	TeamID       *uuid.UUID              `json:"team_id" validate:"omitempty"`
	Status       string                  `json:"status" validate:"omitempty,oneof=draft active paused completed cancelled"`
	Visibility   string                  `json:"visibility" validate:"omitempty,oneof=public team_only private"`
	KanbanStatus string                  `json:"kanban_status" validate:"omitempty,oneof=uncategorized todo doing done"`
	SortOrder    int                     `json:"sort_order"`
	DueDate      *string                 `json:"due_date" validate:"omitempty,datetime=2006-01-02"`
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
	SortOrder    int        `json:"sort_order"`
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
	SortOrder      int        `json:"sort_order"`
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
	Title        *string    `json:"title" validate:"omitempty,min=1,max=200"`
	Description  *string    `json:"description" validate:"omitempty,max=5000"`
	CycleID      *uuid.UUID `json:"cycle_id" validate:"omitempty"`
	OwnerID      *uuid.UUID `json:"owner_id" validate:"omitempty"`
	TeamID       *uuid.UUID `json:"team_id" validate:"omitempty"`
	Status       *string    `json:"status" validate:"omitempty,oneof=draft active paused completed cancelled"`
	Visibility   *string    `json:"visibility" validate:"omitempty,oneof=public team_only private"`
	KanbanStatus *string    `json:"kanban_status" validate:"omitempty,oneof=uncategorized todo doing done"`
	SortOrder    *int       `json:"sort_order" validate:"omitempty"`
	DueDate      *string    `json:"due_date" validate:"omitempty,datetime=2006-01-02"`
}

// isEmpty reports whether the patch body carries no actionable field. The
// handler rejects empty patches with 400 — a no-op PATCH is almost always a
// client bug.
func (r updateRequest) isEmpty() bool {
	return r.Title == nil && r.Description == nil && r.CycleID == nil &&
		r.OwnerID == nil && r.TeamID == nil && r.Status == nil &&
		r.Visibility == nil && r.KanbanStatus == nil && r.SortOrder == nil &&
		r.DueDate == nil
}

var parseOptionalDate = httputil.ParseOptionalDate

func (r createRequest) toCommand(organizationID domain.TenantID) appmission.CreateCommand {
	cmd := appmission.CreateCommand{
		OrganizationID: organizationID,
		Title:          r.Title,
		Description:    r.Description,
		CycleID:        r.CycleID,
		ParentID:       r.ParentID,
		OwnerID:        r.OwnerID,
		TeamID:         r.TeamID,
		Status:         r.Status,
		Visibility:     r.Visibility,
		KanbanStatus:   r.KanbanStatus,
		SortOrder:      r.SortOrder,
		DueDate:        parseOptionalDate(r.DueDate),
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
				SortOrder:    in.SortOrder,
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
				SortOrder:      tk.SortOrder,
				DueDate:        parseOptionalDate(tk.DueDate),
			}
		}
	}
	return cmd
}

func (r updateRequest) toCommand(organizationID domain.TenantID, id uuid.UUID) appmission.UpdateCommand {
	return appmission.UpdateCommand{
		OrganizationID: organizationID,
		ID:             id,
		Title:          r.Title,
		Description:    r.Description,
		CycleID:        r.CycleID,
		OwnerID:        r.OwnerID,
		TeamID:         r.TeamID,
		Status:         r.Status,
		Visibility:     r.Visibility,
		KanbanStatus:   r.KanbanStatus,
		SortOrder:      r.SortOrder,
		DueDate:        parseOptionalDate(r.DueDate),
	}
}
