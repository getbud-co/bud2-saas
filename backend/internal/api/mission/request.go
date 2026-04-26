package mission

import (
	"encoding/json"
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

type updateRequest struct {
	Title        string     `json:"title" validate:"required,min=1,max=200"`
	Description  *string    `json:"description" validate:"omitempty,max=5000"`
	CycleID      *uuid.UUID `json:"cycle_id" validate:"omitempty"`
	ParentID     *uuid.UUID `json:"parent_id" validate:"omitempty"`
	OwnerID      uuid.UUID  `json:"owner_id" validate:"required"`
	TeamID       *uuid.UUID `json:"team_id" validate:"omitempty"`
	Status       string     `json:"status" validate:"required,oneof=draft active paused completed cancelled"`
	Visibility   string     `json:"visibility" validate:"required,oneof=public team_only private"`
	KanbanStatus string     `json:"kanban_status" validate:"required,oneof=uncategorized todo doing done"`
	SortOrder    int        `json:"sort_order"`
	DueDate      *string    `json:"due_date" validate:"omitempty,datetime=2006-01-02"`

	// parentIDPresent tracks whether the JSON body actually included a
	// "parent_id" key. PUT semantics for missing-but-nullable fields are
	// dangerous here: the frontend's edit form does not surface parent_id, so
	// blindly applying the unmarshalled (nil) value would silently detach the
	// mission from its parent on every title edit. We preserve the existing
	// parent unless the client explicitly sets parent_id (to a UUID or null).
	parentIDPresent bool
}

// UnmarshalJSON detects whether "parent_id" was sent by the client (with any
// value, including null) versus omitted entirely. The decoded value goes
// through the regular struct path; the presence flag is the only extra bit
// captured here. Other nullable fields (cycle_id, team_id, description,
// due_date) follow PUT semantics: omitted means "set to null".
func (r *updateRequest) UnmarshalJSON(data []byte) error {
	type alias updateRequest
	if err := json.Unmarshal(data, (*alias)(r)); err != nil {
		return err
	}
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}
	_, r.parentIDPresent = raw["parent_id"]
	return nil
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

func (r updateRequest) toCommand(organizationID domain.TenantID, id uuid.UUID) appmission.UpdateCommand {
	return appmission.UpdateCommand{
		OrganizationID: organizationID,
		ID:             id,
		Title:          r.Title,
		Description:    r.Description,
		CycleID:        r.CycleID,
		ParentID:       r.ParentID,
		SetParentID:    r.parentIDPresent,
		OwnerID:        r.OwnerID,
		TeamID:         r.TeamID,
		Status:         r.Status,
		Visibility:     r.Visibility,
		KanbanStatus:   r.KanbanStatus,
		SortOrder:      r.SortOrder,
		DueDate:        parseOptionalDate(r.DueDate),
	}
}
