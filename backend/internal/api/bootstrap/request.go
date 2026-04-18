package bootstrap

import "github.com/getbud-co/bud2/backend/internal/app/bootstrap"

type createRequest struct {
	OrganizationName      string `json:"organization_name" validate:"required,min=2,max=100"`
	OrganizationDomain    string `json:"organization_domain" validate:"required,email"`
	OrganizationWorkspace string `json:"organization_workspace" validate:"required,min=2,max=100,slug"`
	AdminName             string `json:"admin_name" validate:"required,min=2,max=100"`
	AdminEmail            string `json:"admin_email" validate:"required,email"`
	AdminPassword         string `json:"admin_password" validate:"required,min=8"`
}

func (r createRequest) toCommand() bootstrap.Command {
	return bootstrap.Command{
		OrganizationName:      r.OrganizationName,
		OrganizationDomain:    r.OrganizationDomain,
		OrganizationWorkspace: r.OrganizationWorkspace,
		AdminName:             r.AdminName,
		AdminEmail:            r.AdminEmail,
		AdminPassword:         r.AdminPassword,
	}
}
