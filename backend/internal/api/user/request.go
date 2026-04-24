package user

import (
	"time"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/app/user"
	"github.com/getbud-co/bud2/backend/internal/domain"
)

type createRequest struct {
	FirstName string     `json:"first_name" validate:"required,min=1,max=100"`
	LastName  string     `json:"last_name" validate:"required,min=1,max=100"`
	Email     string     `json:"email" validate:"required,email"`
	Password  string     `json:"password" validate:"required,min=8"`
	Role      string     `json:"role" validate:"required,oneof=super-admin admin-rh gestor colaborador visualizador"`
	Nickname  *string    `json:"nickname,omitempty" validate:"omitempty,min=1,max=100"`
	JobTitle  *string    `json:"job_title,omitempty" validate:"omitempty,min=1,max=100"`
	BirthDate *time.Time `json:"birth_date,omitempty"`
	Language  string     `json:"language,omitempty" validate:"omitempty,min=2,max=10"`
	Gender    *string    `json:"gender,omitempty" validate:"omitempty,oneof=feminino masculino nao-binario prefiro-nao-dizer"`
	Phone     *string    `json:"phone,omitempty" validate:"omitempty,min=1,max=30"`
	TeamIDs   []string   `json:"team_ids,omitempty" validate:"omitempty,dive,uuid"`
}

type updateRequest struct {
	FirstName string     `json:"first_name" validate:"required,min=1,max=100"`
	LastName  string     `json:"last_name" validate:"required,min=1,max=100"`
	Email     string     `json:"email" validate:"required,email"`
	Status    string     `json:"status" validate:"required,oneof=active inactive"`
	Nickname  *string    `json:"nickname,omitempty" validate:"omitempty,min=1,max=100"`
	JobTitle  *string    `json:"job_title,omitempty" validate:"omitempty,min=1,max=100"`
	BirthDate *time.Time `json:"birth_date,omitempty"`
	Language  string     `json:"language,omitempty" validate:"omitempty,min=2,max=10"`
	Gender    *string    `json:"gender,omitempty" validate:"omitempty,oneof=feminino masculino nao-binario prefiro-nao-dizer"`
	Phone     *string    `json:"phone,omitempty" validate:"omitempty,min=1,max=30"`
	TeamIDs   *[]string  `json:"team_ids,omitempty" validate:"omitempty,dive,uuid"`
}

type updateMembershipRequest struct {
	Role   string `json:"role" validate:"required,oneof=super-admin admin-rh gestor colaborador visualizador"`
	Status string `json:"status" validate:"required,oneof=invited active inactive"`
}

func parseUUIDs(ids []string) []uuid.UUID {
	if len(ids) == 0 {
		return nil
	}
	out := make([]uuid.UUID, 0, len(ids))
	for _, s := range ids {
		id, _ := uuid.Parse(s) // already validated as uuid
		out = append(out, id)
	}
	return out
}

func (r createRequest) toCommand(organizationID domain.TenantID) user.CreateCommand {
	return user.CreateCommand{
		OrganizationID: organizationID,
		FirstName:      r.FirstName,
		LastName:       r.LastName,
		Email:          r.Email,
		Password:       r.Password,
		Role:           r.Role,
		Nickname:       r.Nickname,
		JobTitle:       r.JobTitle,
		BirthDate:      r.BirthDate,
		Language:       r.Language,
		Gender:         r.Gender,
		Phone:          r.Phone,
		TeamIDs:        parseUUIDs(r.TeamIDs),
	}
}

func (r updateRequest) toCommand(organizationID domain.TenantID, id uuid.UUID) user.UpdateCommand {
	cmd := user.UpdateCommand{
		OrganizationID: organizationID,
		ID:             id,
		FirstName:      r.FirstName,
		LastName:       r.LastName,
		Email:          r.Email,
		Status:         r.Status,
		Nickname:       r.Nickname,
		JobTitle:       r.JobTitle,
		BirthDate:      r.BirthDate,
		Language:       r.Language,
		Gender:         r.Gender,
		Phone:          r.Phone,
	}
	if r.TeamIDs != nil {
		parsed := parseUUIDs(*r.TeamIDs)
		cmd.TeamIDs = &parsed
	}
	return cmd
}

func (r updateMembershipRequest) toCommand(organizationID domain.TenantID, id uuid.UUID) user.UpdateMembershipCommand {
	return user.UpdateMembershipCommand{
		OrganizationID: organizationID,
		ID:             id,
		Role:           r.Role,
		Status:         r.Status,
	}
}
