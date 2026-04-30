package tag

import (
	"github.com/google/uuid"

	apptag "github.com/getbud-co/bud2/backend/internal/app/tag"
	"github.com/getbud-co/bud2/backend/internal/domain"
)

type createRequest struct {
	Name  string `json:"name" validate:"required,min=1,max=100"`
	Color string `json:"color" validate:"required,oneof=neutral orange wine caramel success warning error"`
}

type updateRequest struct {
	Name  string `json:"name" validate:"required,min=1,max=100"`
	Color string `json:"color" validate:"required,oneof=neutral orange wine caramel success warning error"`
}

func (r createRequest) toCommand(organizationID domain.TenantID) apptag.CreateCommand {
	return apptag.CreateCommand{
		OrganizationID: organizationID,
		Name:           r.Name,
		Color:          r.Color,
	}
}

func (r updateRequest) toCommand(organizationID domain.TenantID, id uuid.UUID) apptag.UpdateCommand {
	return apptag.UpdateCommand{
		OrganizationID: organizationID,
		ID:             id,
		Name:           r.Name,
		Color:          r.Color,
	}
}
