package membership

import (
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
)

type Role string

const (
	RoleSuperAdmin   Role = "super-admin"
	RoleAdminRH      Role = "admin-rh"
	RoleGestor       Role = "gestor"
	RoleColaborador  Role = "colaborador"
	RoleVisualizador Role = "visualizador"
)

func (r Role) IsValid() bool {
	return r == RoleSuperAdmin || r == RoleAdminRH || r == RoleGestor ||
		r == RoleColaborador || r == RoleVisualizador
}

type Status string

const (
	StatusInvited  Status = "invited"
	StatusActive   Status = "active"
	StatusInactive Status = "inactive"
)

func (s Status) IsValid() bool {
	return s == StatusInvited || s == StatusActive || s == StatusInactive
}

type Membership struct {
	ID              uuid.UUID
	OrganizationID  uuid.UUID
	UserID          uuid.UUID
	Role            Role
	Status          Status
	InvitedByUserID *uuid.UUID
	JoinedAt        *time.Time
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

func (m *Membership) Validate() error {
	if m.OrganizationID == uuid.Nil {
		return fmt.Errorf("%w: organization_id is required", domain.ErrValidation)
	}
	if m.UserID == uuid.Nil {
		return fmt.Errorf("%w: user_id is required", domain.ErrValidation)
	}
	if !m.Role.IsValid() {
		return fmt.Errorf("%w: role must be one of: super-admin, admin-rh, gestor, colaborador, visualizador", domain.ErrValidation)
	}
	if !m.Status.IsValid() {
		return fmt.Errorf("%w: status must be invited, active or inactive", domain.ErrValidation)
	}
	return nil
}

var (
	ErrNotFound      = errors.New("membership not found")
	ErrAlreadyExists = errors.New("membership already exists")
)
