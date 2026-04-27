package task

import (
	"time"

	"github.com/google/uuid"

	apptask "github.com/getbud-co/bud2/backend/internal/app/task"
	"github.com/getbud-co/bud2/backend/internal/domain"
)

const dateLayout = "2006-01-02"

type createRequest struct {
	MissionID   uuid.UUID `json:"mission_id" validate:"required"`
	AssigneeID  uuid.UUID `json:"assignee_id" validate:"required"`
	Title       string    `json:"title" validate:"required,min=1,max=200"`
	Description *string   `json:"description" validate:"omitempty,max=5000"`
	Status      string    `json:"status" validate:"omitempty,oneof=todo in_progress done cancelled"`
	SortOrder   int       `json:"sort_order"`
	DueDate     *string   `json:"due_date" validate:"omitempty,datetime=2006-01-02"`
}

// updateRequest models JSON Merge Patch (RFC 7396) semantics. mission_id is
// intentionally absent — moving a task between missions is not exposed.
type updateRequest struct {
	Title       *string    `json:"title" validate:"omitempty,min=1,max=200"`
	Description *string    `json:"description" validate:"omitempty,max=5000"`
	AssigneeID  *uuid.UUID `json:"assignee_id" validate:"omitempty"`
	Status      *string    `json:"status" validate:"omitempty,oneof=todo in_progress done cancelled"`
	SortOrder   *int       `json:"sort_order"`
	DueDate     *string    `json:"due_date" validate:"omitempty,datetime=2006-01-02"`
}

func (r updateRequest) isEmpty() bool {
	return r.Title == nil && r.Description == nil && r.AssigneeID == nil &&
		r.Status == nil && r.SortOrder == nil && r.DueDate == nil
}

func parseOptionalDate(value *string) *time.Time {
	if value == nil {
		return nil
	}
	parsed, err := time.Parse(dateLayout, *value)
	if err != nil {
		return nil
	}
	return &parsed
}

func (r createRequest) toCommand(organizationID domain.TenantID) apptask.CreateCommand {
	return apptask.CreateCommand{
		OrganizationID: organizationID,
		MissionID:      r.MissionID,
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
		AssigneeID:     r.AssigneeID,
		Status:         r.Status,
		SortOrder:      r.SortOrder,
		DueDate:        parseOptionalDate(r.DueDate),
	}
}
