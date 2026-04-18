package user

import (
	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/app/user"
	"github.com/getbud-co/bud2/backend/internal/domain"
)

type createRequest struct {
	Name     string `json:"name" validate:"required,min=2,max=100"`
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
	Role     string `json:"role" validate:"required,oneof=admin manager collaborator"`
}

type updateRequest struct {
	Name   string `json:"name" validate:"required,min=2,max=100"`
	Email  string `json:"email" validate:"required,email"`
	Status string `json:"status" validate:"required,oneof=active inactive"`
}

type updateMembershipRequest struct {
	Role   string `json:"role" validate:"required,oneof=admin manager collaborator"`
	Status string `json:"status" validate:"required,oneof=invited active inactive"`
}

func (r createRequest) toCommand(organizationID domain.TenantID) user.CreateCommand {
	return user.CreateCommand{
		OrganizationID: organizationID,
		Name:           r.Name,
		Email:          r.Email,
		Password:       r.Password,
		Role:           r.Role,
	}
}

func (r updateRequest) toCommand(organizationID domain.TenantID, id uuid.UUID) user.UpdateCommand {
	return user.UpdateCommand{
		OrganizationID: organizationID,
		ID:             id,
		Name:           r.Name,
		Email:          r.Email,
		Status:         r.Status,
	}
}

func (r updateMembershipRequest) toCommand(organizationID domain.TenantID, id uuid.UUID) user.UpdateMembershipCommand {
	return user.UpdateMembershipCommand{
		OrganizationID: organizationID,
		ID:             id,
		Role:           r.Role,
		Status:         r.Status,
	}
}
