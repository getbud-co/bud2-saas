package bootstrap

import "github.com/getbud-co/bud2/backend/internal/app/bootstrap"

type Response struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	Organization struct {
		ID        string `json:"id"`
		Name      string `json:"name"`
		Domain    string `json:"domain"`
		Workspace string `json:"workspace"`
	} `json:"organization"`
	Admin struct {
		ID            string `json:"id"`
		Name          string `json:"name"`
		Email         string `json:"email"`
		IsSystemAdmin bool   `json:"is_system_admin"`
	} `json:"admin"`
}

func createBootstrapResponse(result *bootstrap.Result) Response {
	resp := Response{AccessToken: result.AccessToken, TokenType: "Bearer"}
	resp.Organization.ID = result.Organization.ID.String()
	resp.Organization.Name = result.Organization.Name
	resp.Organization.Domain = result.Organization.Domain
	resp.Organization.Workspace = result.Organization.Workspace
	resp.Admin.ID = result.Admin.ID.String()
	resp.Admin.Name = result.Admin.Name
	resp.Admin.Email = result.Admin.Email
	resp.Admin.IsSystemAdmin = result.Admin.IsSystemAdmin

	return resp
}
