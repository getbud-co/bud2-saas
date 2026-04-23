package team

import (
	"github.com/google/uuid"

	appteam "github.com/getbud-co/bud2/backend/internal/app/team"
	"github.com/getbud-co/bud2/backend/internal/domain"
)

type memberInput struct {
	UserID     string `json:"user_id" validate:"required,uuid"`
	RoleInTeam string `json:"role_in_team" validate:"required,oneof=leader member observer"`
}

type createRequest struct {
	Name        string        `json:"name" validate:"required,min=1,max=200"`
	Description *string       `json:"description,omitempty" validate:"omitempty,max=500"`
	Color       string        `json:"color" validate:"required,oneof=neutral orange wine caramel success warning error"`
	Members     []memberInput `json:"members,omitempty" validate:"omitempty,dive"`
}

type updateRequest struct {
	Name        string        `json:"name" validate:"required,min=1,max=200"`
	Description *string       `json:"description,omitempty" validate:"omitempty,max=500"`
	Color       string        `json:"color" validate:"required,oneof=neutral orange wine caramel success warning error"`
	Status      string        `json:"status" validate:"required,oneof=active archived"`
	Members     []memberInput `json:"members,omitempty" validate:"omitempty,dive"`
}

func toMemberInputs(members []memberInput) []appteam.MemberInput {
	out := make([]appteam.MemberInput, 0, len(members))
	for _, m := range members {
		id, _ := uuid.Parse(m.UserID) // already validated as uuid by the validator
		out = append(out, appteam.MemberInput{
			UserID:     id,
			RoleInTeam: m.RoleInTeam,
		})
	}
	return out
}

func (r createRequest) toCommand(organizationID domain.TenantID) appteam.CreateCommand {
	return appteam.CreateCommand{
		OrganizationID: organizationID,
		Name:           r.Name,
		Description:    r.Description,
		Color:          r.Color,
		Members:        toMemberInputs(r.Members),
	}
}

func (r updateRequest) toCommand(organizationID domain.TenantID, id uuid.UUID) appteam.UpdateCommand {
	return appteam.UpdateCommand{
		OrganizationID: organizationID,
		ID:             id,
		Name:           r.Name,
		Description:    r.Description,
		Color:          r.Color,
		Status:         r.Status,
		Members:        toMemberInputs(r.Members),
	}
}
