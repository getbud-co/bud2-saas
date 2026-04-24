package cycle

import (
	"time"

	domaincycle "github.com/getbud-co/bud2/backend/internal/domain/cycle"
)

type Response struct {
	ID                    string  `json:"id"`
	OrgID                 string  `json:"org_id"`
	Name                  string  `json:"name"`
	Type                  string  `json:"type"`
	StartDate             string  `json:"start_date"`
	EndDate               string  `json:"end_date"`
	Status                string  `json:"status"`
	OKRDefinitionDeadline *string `json:"okr_definition_deadline"`
	MidReviewDate         *string `json:"mid_review_date"`
	CreatedAt             string  `json:"created_at"`
	UpdatedAt             string  `json:"updated_at"`
}

type ListResponse struct {
	Data  []Response `json:"data"`
	Total int64      `json:"total"`
	Page  int        `json:"page"`
	Size  int        `json:"size"`
}

func toResponse(c *domaincycle.Cycle) Response {
	return Response{
		ID:                    c.ID.String(),
		OrgID:                 c.OrganizationID.String(),
		Name:                  c.Name,
		Type:                  string(c.Type),
		StartDate:             formatDate(c.StartDate),
		EndDate:               formatDate(c.EndDate),
		Status:                string(c.Status),
		OKRDefinitionDeadline: formatOptionalDate(c.OKRDefinitionDeadline),
		MidReviewDate:         formatOptionalDate(c.MidReviewDate),
		CreatedAt:             c.CreatedAt.Format(time.RFC3339),
		UpdatedAt:             c.UpdatedAt.Format(time.RFC3339),
	}
}

func formatDate(value time.Time) string {
	return value.Format(dateLayout)
}

func formatOptionalDate(value *time.Time) *string {
	if value == nil {
		return nil
	}
	formatted := formatDate(*value)
	return &formatted
}
