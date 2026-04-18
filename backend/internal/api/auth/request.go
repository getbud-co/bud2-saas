package auth

import (
	"github.com/google/uuid"

	appauth "github.com/getbud-co/bud2/backend/internal/app/auth"
)

type loginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
}

type updateSessionRequest struct {
	OrganizationID string `json:"organization_id" validate:"required,uuid4"`
}

type refreshRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

func (r loginRequest) toCommand() appauth.LoginCommand {
	return appauth.LoginCommand{
		Email:    r.Email,
		Password: r.Password,
	}
}

func (r updateSessionRequest) toCommand() (appauth.SwitchOrganizationCommand, error) {
	organizationID, err := uuid.Parse(r.OrganizationID)
	if err != nil {
		return appauth.SwitchOrganizationCommand{}, err
	}
	return appauth.SwitchOrganizationCommand{OrganizationID: organizationID}, nil
}
