package task

import (
	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/api/httputil"
	apptask "github.com/getbud-co/bud2/backend/internal/app/task"
	"github.com/getbud-co/bud2/backend/internal/domain"
)

type createRequest struct {
	MissionID   uuid.UUID  `json:"mission_id" validate:"required"`
	IndicatorID *uuid.UUID `json:"indicator_id" validate:"omitempty"`
	AssigneeID  uuid.UUID  `json:"assignee_id" validate:"required"`
	Title       string     `json:"title" validate:"required,min=1,max=200"`
	Description *string    `json:"description" validate:"omitempty,max=5000"`
	Status      string     `json:"status" validate:"omitempty,oneof=todo in_progress done cancelled"`
	SortOrder   int        `json:"sort_order"`
	DueDate     *string    `json:"due_date" validate:"omitempty,datetime=2006-01-02"`
}

// updateRequest models JSON Merge Patch (RFC 7396) semantics. mission_id is
// intentionally absent — moving a task between missions is not exposed.
// indicator_id, however, can be re-assigned within the same mission.
type updateRequest struct {
	Title       *string    `json:"title" validate:"omitempty,min=1,max=200"`
	Description *string    `json:"description" validate:"omitempty,max=5000"`
	IndicatorID *uuid.UUID `json:"indicator_id" validate:"omitempty"`
	AssigneeID  *uuid.UUID `json:"assignee_id" validate:"omitempty"`
	Status      *string    `json:"status" validate:"omitempty,oneof=todo in_progress done cancelled"`
	SortOrder   *int       `json:"sort_order"`
	DueDate     *string    `json:"due_date" validate:"omitempty,datetime=2006-01-02"`
}

func (r updateRequest) isEmpty() bool {
	return r.Title == nil && r.Description == nil && r.IndicatorID == nil &&
		r.AssigneeID == nil && r.Status == nil && r.SortOrder == nil && r.DueDate == nil
}

var parseOptionalDate = httputil.ParseOptionalDate

func (r createRequest) toCommand(organizationID domain.TenantID) apptask.CreateCommand {
	return apptask.CreateCommand{
		OrganizationID: organizationID,
		MissionID:      r.MissionID,
		IndicatorID:    r.IndicatorID,
		AssigneeID:     r.AssigneeID,
		Title:          r.Title,
		Description:    r.Description,
		Status:         r.Status,
		SortOrder:      r.SortOrder,
		DueDate:        parseOptionalDate(r.DueDate),
	}
}

func (r updateRequest) toCommand(organizationID domain.TenantID, id uuid.UUID) apptask.UpdateCommand {
	return apptask.UpdateCommand{
		OrganizationID: organizationID,
		ID:             id,
		Title:          r.Title,
		Description:    r.Description,
		IndicatorID:    r.IndicatorID,
		AssigneeID:     r.AssigneeID,
		Status:         r.Status,
		SortOrder:      r.SortOrder,
		DueDate:        parseOptionalDate(r.DueDate),
	}
}
