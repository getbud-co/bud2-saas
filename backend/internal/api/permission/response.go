package permission

import (
	domainperm "github.com/getbud-co/bud2/backend/internal/domain/permission"
)

type Response struct {
	ID          string `json:"id"`
	Group       string `json:"group"`
	Label       string `json:"label"`
	Description string `json:"description"`
}

type ListResponse struct {
	Data []Response `json:"data"`
}

func toResponse(p domainperm.Permission) Response {
	return Response{
		ID:          p.ID,
		Group:       string(p.Group),
		Label:       p.Label,
		Description: p.Description,
	}
}

func toListResponse(perms []domainperm.Permission) ListResponse {
	data := make([]Response, 0, len(perms))
	for _, p := range perms {
		data = append(data, toResponse(p))
	}
	return ListResponse{Data: data}
}
