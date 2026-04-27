package indicator

import (
	"time"

	"github.com/google/uuid"

	appindicator "github.com/getbud-co/bud2/backend/internal/app/indicator"
	"github.com/getbud-co/bud2/backend/internal/domain"
)

const dateLayout = "2006-01-02"

type createRequest struct {
	MissionID    uuid.UUID `json:"mission_id" validate:"required"`
	OwnerID      uuid.UUID `json:"owner_id" validate:"required"`
	Title        string    `json:"title" validate:"required,min=1,max=200"`
	Description  *string   `json:"description" validate:"omitempty,max=5000"`
	TargetValue  *float64  `json:"target_value"`
	CurrentValue *float64  `json:"current_value"`
	Unit         *string   `json:"unit" validate:"omitempty,max=32"`
	Status       string    `json:"status" validate:"omitempty,oneof=draft active at_risk done archived"`
	SortOrder    int       `json:"sort_order"`
	DueDate      *string   `json:"due_date" validate:"omitempty,datetime=2006-01-02"`
}

// updateRequest models JSON Merge Patch (RFC 7396) semantics: every field is
// a pointer, only non-nil fields apply. mission_id is intentionally absent —
// moving an indicator between missions is not exposed via this endpoint.
type updateRequest struct {
	Title        *string    `json:"title" validate:"omitempty,min=1,max=200"`
	Description  *string    `json:"description" validate:"omitempty,max=5000"`
	OwnerID      *uuid.UUID `json:"owner_id" validate:"omitempty"`
	TargetValue  *float64   `json:"target_value"`
	CurrentValue *float64   `json:"current_value"`
	Unit         *string    `json:"unit" validate:"omitempty,max=32"`
	Status       *string    `json:"status" validate:"omitempty,oneof=draft active at_risk done archived"`
	SortOrder    *int       `json:"sort_order"`
	DueDate      *string    `json:"due_date" validate:"omitempty,datetime=2006-01-02"`
}

func (r updateRequest) isEmpty() bool {
	return r.Title == nil && r.Description == nil && r.OwnerID == nil &&
		r.TargetValue == nil && r.CurrentValue == nil && r.Unit == nil &&
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

func (r createRequest) toCommand(organizationID domain.TenantID) appindicator.CreateCommand {
	return appindicator.CreateCommand{
		OrganizationID: organizationID,
		MissionID:      r.MissionID,
		OwnerID:        r.OwnerID,
		Title:          r.Title,
		Description:    r.Description,
		TargetValue:    r.TargetValue,
		CurrentValue:   r.CurrentValue,
		Unit:           r.Unit,
		Status:         r.Status,
		SortOrder:      r.SortOrder,
		DueDate:        parseOptionalDate(r.DueDate),
	}
}

func (r updateRequest) toCommand(organizationID domain.TenantID, id uuid.UUID) appindicator.UpdateCommand {
	return appindicator.UpdateCommand{
		OrganizationID: organizationID,
		ID:             id,
		Title:          r.Title,
		Description:    r.Description,
		OwnerID:        r.OwnerID,
		TargetValue:    r.TargetValue,
		CurrentValue:   r.CurrentValue,
		Unit:           r.Unit,
		Status:         r.Status,
		SortOrder:      r.SortOrder,
		DueDate:        parseOptionalDate(r.DueDate),
	}
}
