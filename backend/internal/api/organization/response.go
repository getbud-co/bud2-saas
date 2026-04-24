package organization

import (
	"time"

	"github.com/google/uuid"

	org "github.com/getbud-co/bud2/backend/internal/domain/organization"
)

type Response struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Domain    string    `json:"domain"`
	Workspace string    `json:"workspace"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type ListResponse struct {
	Data  []Response `json:"data"`
	Total int64      `json:"total"`
	Page  int        `json:"page"`
	Size  int        `json:"size"`
}

func toResponse(o *org.Organization) Response {
	return Response{
		ID:        o.ID,
		Name:      o.Name,
		Domain:    o.Domain,
		Workspace: o.Workspace,
		Status:    string(o.Status),
		CreatedAt: o.CreatedAt,
		UpdatedAt: o.UpdatedAt,
	}
}
