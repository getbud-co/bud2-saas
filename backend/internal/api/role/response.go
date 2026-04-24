package role

import (
	"time"

	domainrole "github.com/getbud-co/bud2/backend/internal/domain/role"
)

type Response struct {
	ID            string   `json:"id"`
	Slug          string   `json:"slug"`
	Name          string   `json:"name"`
	Description   *string  `json:"description,omitempty"`
	Type          string   `json:"type"`
	Scope         string   `json:"scope"`
	IsDefault     bool     `json:"is_default"`
	PermissionIDs []string `json:"permission_ids"`
	UsersCount    int      `json:"users_count"`
	CreatedAt     string   `json:"created_at"`
	UpdatedAt     string   `json:"updated_at"`
}

type ListResponse struct {
	Data []Response `json:"data"`
}

func toResponse(r domainrole.Role) Response {
	ids := r.PermissionIDs
	if ids == nil {
		ids = []string{}
	}
	return Response{
		ID:            r.ID.String(),
		Slug:          r.Slug,
		Name:          r.Name,
		Description:   r.Description,
		Type:          string(r.Type),
		Scope:         string(r.Scope),
		IsDefault:     r.IsDefault,
		PermissionIDs: ids,
		UsersCount:    r.UsersCount,
		CreatedAt:     r.CreatedAt.Format(time.RFC3339),
		UpdatedAt:     r.UpdatedAt.Format(time.RFC3339),
	}
}

func toListResponse(roles []domainrole.Role) ListResponse {
	data := make([]Response, 0, len(roles))
	for _, r := range roles {
		data = append(data, toResponse(r))
	}
	return ListResponse{Data: data}
}
