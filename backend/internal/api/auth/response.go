package auth

import appauth "github.com/getbud-co/bud2/backend/internal/app/auth"

type authResponse struct {
	AccessToken        string                 `json:"access_token,omitempty"`
	RefreshToken       string                 `json:"refresh_token,omitempty"`
	TokenType          string                 `json:"token_type,omitempty"`
	User               userResponse           `json:"user"`
	ActiveOrganization *organizationResponse  `json:"active_organization,omitempty"`
	Organizations      []organizationResponse `json:"organizations"`
}

type userResponse struct {
	ID            string `json:"id"`
	FirstName     string `json:"first_name"`
	LastName      string `json:"last_name"`
	Email         string `json:"email"`
	Status        string `json:"status"`
	IsSystemAdmin bool   `json:"is_system_admin"`
}

type organizationResponse struct {
	ID               string `json:"id"`
	Name             string `json:"name"`
	Domain           string `json:"domain"`
	Workspace        string `json:"workspace"`
	Status           string `json:"status"`
	MembershipRole   string `json:"membership_role,omitempty"`
	MembershipStatus string `json:"membership_status,omitempty"`
}

func responseFromSession(session appauth.Session) authResponse {
	resp := authResponse{
		User: userResponse{
			ID:            session.User.ID.String(),
			FirstName:     session.User.FirstName,
			LastName:      session.User.LastName,
			Email:         session.User.Email,
			Status:        string(session.User.Status),
			IsSystemAdmin: session.User.IsSystemAdmin,
		},
		Organizations: make([]organizationResponse, len(session.Organizations)),
	}
	for i := range session.Organizations {
		resp.Organizations[i] = organizationResponse{
			ID:               session.Organizations[i].ID.String(),
			Name:             session.Organizations[i].Name,
			Domain:           session.Organizations[i].Domain,
			Workspace:        session.Organizations[i].Workspace,
			Status:           string(session.Organizations[i].Status),
			MembershipRole:   session.Organizations[i].MembershipRole,
			MembershipStatus: session.Organizations[i].MembershipStatus,
		}
	}
	if session.ActiveOrganization != nil {
		resp.ActiveOrganization = &organizationResponse{
			ID:               session.ActiveOrganization.ID.String(),
			Name:             session.ActiveOrganization.Name,
			Domain:           session.ActiveOrganization.Domain,
			Workspace:        session.ActiveOrganization.Workspace,
			Status:           string(session.ActiveOrganization.Status),
			MembershipRole:   session.ActiveOrganization.MembershipRole,
			MembershipStatus: session.ActiveOrganization.MembershipStatus,
		}
	}
	return resp
}
