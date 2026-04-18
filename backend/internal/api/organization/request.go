package organization

import (
	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/app/organization"
)

type createRequest struct {
	Name      string `json:"name" validate:"required,min=2,max=100"`
	Domain    string `json:"domain" validate:"required,email"`
	Workspace string `json:"workspace" validate:"required,min=2,max=100,slug"`
	Status    string `json:"status" validate:"omitempty,oneof=active inactive"`
}

type updateRequest struct {
	Name      string `json:"name" validate:"required,min=2,max=100"`
	Domain    string `json:"domain" validate:"required,email"`
	Workspace string `json:"workspace" validate:"required,min=2,max=100,slug"`
	Status    string `json:"status" validate:"required,oneof=active inactive"`
}

func (r createRequest) toCommand() organization.CreateCommand {
	return organization.CreateCommand{
		Name:      r.Name,
		Domain:    r.Domain,
		Workspace: r.Workspace,
		Status:    r.Status,
	}
}

func (r updateRequest) toCommand(id uuid.UUID) organization.UpdateCommand {
	return organization.UpdateCommand{
		ID:        id,
		Name:      r.Name,
		Domain:    r.Domain,
		Workspace: r.Workspace,
		Status:    r.Status,
	}
}
