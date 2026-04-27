package indicator

import (
	"time"

	domainindicator "github.com/getbud-co/bud2/backend/internal/domain/indicator"
)

type Response struct {
	ID           string   `json:"id"`
	OrgID        string   `json:"org_id"`
	MissionID    string   `json:"mission_id"`
	OwnerID      string   `json:"owner_id"`
	Title        string   `json:"title"`
	Description  *string  `json:"description"`
	TargetValue  *float64 `json:"target_value"`
	CurrentValue *float64 `json:"current_value"`
	Unit         *string  `json:"unit"`
	Status       string   `json:"status"`
	SortOrder    int      `json:"sort_order"`
	DueDate      *string  `json:"due_date"`
	CreatedAt    string   `json:"created_at"`
	UpdatedAt    string   `json:"updated_at"`
}

type ListResponse struct {
	Data  []Response `json:"data"`
	Total int64      `json:"total"`
	Page  int        `json:"page"`
	Size  int        `json:"size"`
}

func toResponse(i *domainindicator.Indicator) Response {
	return Response{
		ID:           i.ID.String(),
		OrgID:        i.OrganizationID.String(),
		MissionID:    i.MissionID.String(),
		OwnerID:      i.OwnerID.String(),
		Title:        i.Title,
		Description:  i.Description,
		TargetValue:  i.TargetValue,
		CurrentValue: i.CurrentValue,
		Unit:         i.Unit,
		Status:       string(i.Status),
		SortOrder:    i.SortOrder,
		DueDate:      formatOptionalDate(i.DueDate),
		CreatedAt:    i.CreatedAt.Format(time.RFC3339),
		UpdatedAt:    i.UpdatedAt.Format(time.RFC3339),
	}
}

func formatOptionalDate(value *time.Time) *string {
	if value == nil {
		return nil
	}
	formatted := value.Format(dateLayout)
	return &formatted
}

