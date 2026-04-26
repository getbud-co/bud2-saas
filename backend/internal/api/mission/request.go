package mission

import (
	"time"

	"github.com/google/uuid"

	appmission "github.com/getbud-co/bud2/backend/internal/app/mission"
	"github.com/getbud-co/bud2/backend/internal/domain"
)

const dateLayout = "2006-01-02"

type createRequest struct {
	Title        string     `json:"title" validate:"required,min=1,max=200"`
	Description  *string    `json:"description" validate:"omitempty,max=5000"`
	CycleID      *uuid.UUID `json:"cycle_id" validate:"omitempty"`
	ParentID     *uuid.UUID `json:"parent_id" validate:"omitempty"`
	OwnerID      uuid.UUID  `json:"owner_id" validate:"required"`
	TeamID       *uuid.UUID `json:"team_id" validate:"omitempty"`
	Status       string     `json:"status" validate:"omitempty,oneof=draft active paused completed cancelled"`
	Visibility   string     `json:"visibility" validate:"omitempty,oneof=public team_only private"`
	KanbanStatus string     `json:"kanban_status" validate:"omitempty,oneof=uncategorized todo doing done"`
	SortOrder    int        `json:"sort_order"`
	DueDate      *string    `json:"due_date" validate:"omitempty,datetime=2006-01-02"`
}

// patchRequest models JSON Merge Patch (RFC 7396) semantics: every field is
// a pointer, and only non-nil fields are applied to the existing mission.
// Absent (nil) fields preserve their current value. `parent_id` is
// intentionally absent — reparent is not exposed via this endpoint.
//
// Limitation: with single pointers we cannot distinguish "field omitted"
// from "field explicitly null". Sending null on a nullable field does NOT
// clear it. If clearing is needed in the future, switch to **T or a Wrapper.
type patchRequest struct {
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
func (r patchRequest) isEmpty() bool {
	return r.Title == nil && r.Description == nil && r.CycleID == nil &&
		r.OwnerID == nil && r.TeamID == nil && r.Status == nil &&
		r.Visibility == nil && r.KanbanStatus == nil && r.SortOrder == nil &&
		r.DueDate == nil
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

func (r createRequest) toCommand(organizationID domain.TenantID) appmission.CreateCommand {
	return appmission.CreateCommand{
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
}

func (r patchRequest) toCommand(organizationID domain.TenantID, id uuid.UUID) appmission.PatchCommand {
	return appmission.PatchCommand{
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
