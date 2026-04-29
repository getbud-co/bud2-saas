package tag

import (
	"time"

	domaintag "github.com/getbud-co/bud2/backend/internal/domain/tag"
)

type Response struct {
	ID         string `json:"id"`
	OrgID      string `json:"org_id"`
	Name       string `json:"name"`
	Color      string `json:"color"`
	UsageCount int64  `json:"usage_count"`
	CreatedAt  string `json:"created_at"`
	UpdatedAt  string `json:"updated_at"`
}

type ListResponse struct {
	Data  []Response `json:"data"`
	Total int64      `json:"total"`
	Page  int        `json:"page"`
	Size  int        `json:"size"`
}

func toResponse(t *domaintag.Tag) Response {
	return Response{
		ID:         t.ID.String(),
		OrgID:      t.OrganizationID.String(),
		Name:       t.Name,
		Color:      string(t.Color),
		UsageCount: t.UsageCount,
		CreatedAt:  t.CreatedAt.Format(time.RFC3339),
		UpdatedAt:  t.UpdatedAt.Format(time.RFC3339),
	}
}
