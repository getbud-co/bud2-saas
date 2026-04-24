package bootstrap

import appbootstrap "github.com/getbud-co/bud2/backend/internal/app/bootstrap"

type createRequest struct {
	OrganizationName      string `json:"organization_name" validate:"required,min=2,max=100"`
	OrganizationDomain    string `json:"organization_domain" validate:"required,fqdn"`
	OrganizationWorkspace string `json:"organization_workspace" validate:"required,min=2,max=100,slug"`
	AdminFirstName        string `json:"admin_first_name" validate:"required,min=1,max=100"`
	AdminLastName         string `json:"admin_last_name" validate:"required,min=1,max=100"`
	AdminEmail            string `json:"admin_email" validate:"required,email"`
	AdminPassword         string `json:"admin_password" validate:"required,min=8"`
}

func (r createRequest) toCommand() appbootstrap.Command {
	return appbootstrap.Command{
		OrganizationName:      r.OrganizationName,
		OrganizationDomain:    r.OrganizationDomain,
		OrganizationWorkspace: r.OrganizationWorkspace,
		AdminFirstName:        r.AdminFirstName,
		AdminLastName:         r.AdminLastName,
		AdminEmail:            r.AdminEmail,
		AdminPassword:         r.AdminPassword,
	}
}
