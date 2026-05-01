package organization

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"time"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
)

var domainRegex = regexp.MustCompile(`^([a-zA-Z0-9][a-zA-Z0-9-]{0,62})(\.[a-zA-Z0-9][a-zA-Z0-9-]{0,62})*(\.[a-zA-Z][a-zA-Z0-9-]{0,62})\.?$`)

type Status string

const (
	StatusActive   Status = "active"
	StatusInactive Status = "inactive"
)

func (s Status) IsValid() bool {
	return s == StatusActive || s == StatusInactive
}

type Organization struct {
	ID        uuid.UUID
	Name      string
	Domain    string
	Workspace string
	Status    Status
	CreatedAt time.Time
	UpdatedAt time.Time
}

func (o *Organization) validateInvariants() error {
	if o.Name == "" {
		return fmt.Errorf("%w: name is required", domain.ErrValidation)
	}
	if o.Domain == "" {
		return fmt.Errorf("%w: domain is required", domain.ErrValidation)
	}
	if !domainRegex.MatchString(o.Domain) {
		return fmt.Errorf("%w: domain must be a valid domain name", domain.ErrValidation)
	}
	if o.Workspace == "" {
		return fmt.Errorf("%w: workspace is required", domain.ErrValidation)
	}
	if !o.Status.IsValid() {
		return fmt.Errorf("%w: status must be active or inactive", domain.ErrValidation)
	}
	return nil
}

// Validate is the public invariant check used by repositories post-load and update use cases.
func (o *Organization) Validate() error {
	return o.validateInvariants()
}

// OrgOption configures optional fields on an Organization during construction.
type OrgOption func(*Organization)

func WithStatus(s Status) OrgOption {
	return func(o *Organization) { o.Status = s }
}

// NewOrganization constructs an always-valid Organization. Defaults Status to active.
// Note: ID is assigned by the database on persist; the returned struct has no ID until after Create.
func NewOrganization(name, domainName, workspace string, opts ...OrgOption) (*Organization, error) {
	o := &Organization{
		Name:      name,
		Domain:    domainName,
		Workspace: workspace,
		Status:    StatusActive,
	}
	for _, opt := range opts {
		opt(o)
	}
	if err := o.validateInvariants(); err != nil {
		return nil, err
	}
	return o, nil
}

type MembershipRole string

const (
	MembershipRoleSuperAdmin   MembershipRole = "super-admin"
	MembershipRoleAdminRH      MembershipRole = "admin-rh"
	MembershipRoleGestor       MembershipRole = "gestor"
	MembershipRoleColaborador  MembershipRole = "colaborador"
	MembershipRoleVisualizador MembershipRole = "visualizador"
)

func (r MembershipRole) IsValid() bool {
	return r == MembershipRoleSuperAdmin || r == MembershipRoleAdminRH || r == MembershipRoleGestor ||
		r == MembershipRoleColaborador || r == MembershipRoleVisualizador
}

type MembershipStatus string

const (
	MembershipStatusInvited  MembershipStatus = "invited"
	MembershipStatusActive   MembershipStatus = "active"
	MembershipStatusInactive MembershipStatus = "inactive"
)

func (s MembershipStatus) IsValid() bool {
	return s == MembershipStatusInvited || s == MembershipStatusActive || s == MembershipStatusInactive
}

type Membership struct {
	ID              uuid.UUID
	OrganizationID  uuid.UUID
	UserID          uuid.UUID
	Role            MembershipRole
	Status          MembershipStatus
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

type ListFilter struct {
	Status *Status
	Page   int
	Size   int
}

type ListResult struct {
	Organizations []Organization
	Total         int64
}

type Repository interface {
	Create(ctx context.Context, org *Organization) (*Organization, error)
	GetByID(ctx context.Context, id uuid.UUID) (*Organization, error)
	GetByIDForUser(ctx context.Context, userID uuid.UUID, id uuid.UUID) (*Organization, error)
	GetByDomain(ctx context.Context, domain string) (*Organization, error)
	GetByWorkspace(ctx context.Context, workspace string) (*Organization, error)
	List(ctx context.Context, filter ListFilter) (ListResult, error)
	ListByUser(ctx context.Context, userID uuid.UUID, filter ListFilter) (ListResult, error)
	Update(ctx context.Context, org *Organization) (*Organization, error)
	Delete(ctx context.Context, id uuid.UUID) error
	CountAll(ctx context.Context) (int64, error)
}

var (
	ErrNotFound                = errors.New("organization not found")
	ErrDomainExists            = errors.New("organization domain already exists")
	ErrWorkspaceExists         = errors.New("organization workspace already exists")
	ErrMembershipNotFound      = errors.New("membership not found")
	ErrMembershipAlreadyExists = errors.New("membership already exists")
)
