package team

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
)

type Status string

const (
	StatusActive   Status = "active"
	StatusArchived Status = "archived"
)

func (s Status) IsValid() bool {
	return s == StatusActive || s == StatusArchived
}

type Color string

const (
	ColorNeutral Color = "neutral"
	ColorOrange  Color = "orange"
	ColorWine    Color = "wine"
	ColorCaramel Color = "caramel"
	ColorSuccess Color = "success"
	ColorWarning Color = "warning"
	ColorError   Color = "error"
)

func (c Color) IsValid() bool {
	switch c {
	case ColorNeutral, ColorOrange, ColorWine, ColorCaramel, ColorSuccess, ColorWarning, ColorError:
		return true
	}
	return false
}

type RoleInTeam string

const (
	RoleLeader   RoleInTeam = "leader"
	RoleMember   RoleInTeam = "member"
	RoleObserver RoleInTeam = "observer"
)

func (r RoleInTeam) IsValid() bool {
	return r == RoleLeader || r == RoleMember || r == RoleObserver
}

type TeamMember struct {
	ID            uuid.UUID
	TeamID        uuid.UUID
	UserID        uuid.UUID
	RoleInTeam    RoleInTeam
	JoinedAt      time.Time
	CreatedAt     time.Time
	UpdatedAt     time.Time
	UserFirstName *string
	UserLastName  *string
	UserJobTitle  *string
}

func (m *TeamMember) Validate() error {
	if m.UserID == uuid.Nil {
		return fmt.Errorf("%w: member user_id is required", domain.ErrValidation)
	}
	if !m.RoleInTeam.IsValid() {
		return fmt.Errorf("%w: role_in_team must be one of: leader, member, observer", domain.ErrValidation)
	}
	return nil
}

type Team struct {
	ID             uuid.UUID
	OrganizationID uuid.UUID
	Name           string
	Description    *string
	Color          Color
	Status         Status
	Members        []TeamMember
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

func (t *Team) validateInvariants() error {
	if t.Name == "" {
		return fmt.Errorf("%w: name is required", domain.ErrValidation)
	}
	if !t.Color.IsValid() {
		return fmt.Errorf("%w: color must be one of: neutral, orange, wine, caramel, success, warning, error", domain.ErrValidation)
	}
	if !t.Status.IsValid() {
		return fmt.Errorf("%w: status must be active or archived", domain.ErrValidation)
	}
	hasLeader := false
	for i := range t.Members {
		if err := t.Members[i].Validate(); err != nil {
			return err
		}
		if t.Members[i].RoleInTeam == RoleLeader {
			hasLeader = true
		}
	}
	if len(t.Members) > 0 && !hasLeader {
		return fmt.Errorf("%w: at least one member must have role leader", domain.ErrValidation)
	}
	return nil
}

// Validate is the public invariant check used by repositories post-load and update use cases.
func (t *Team) Validate() error {
	return t.validateInvariants()
}

// TeamOption configures optional fields on a Team during construction.
type TeamOption func(*Team)

func WithDescription(d *string) TeamOption {
	return func(t *Team) { t.Description = d }
}

// NewTeam constructs an always-valid Team. Generates ID, defaults Status to active,
// and enforces invariants before returning.
func NewTeam(orgID uuid.UUID, name string, color Color, members []TeamMember, opts ...TeamOption) (*Team, error) {
	t := &Team{
		ID:             uuid.New(),
		OrganizationID: orgID,
		Name:           name,
		Color:          color,
		Status:         StatusActive,
		Members:        members,
	}
	for _, opt := range opts {
		opt(t)
	}
	if err := t.validateInvariants(); err != nil {
		return nil, err
	}
	return t, nil
}

type ListResult struct {
	Teams []Team
	Total int64
}

type Repository interface {
	Create(ctx context.Context, team *Team) (*Team, error)
	GetByID(ctx context.Context, id, organizationID uuid.UUID) (*Team, error)
	GetByName(ctx context.Context, organizationID uuid.UUID, name string) (*Team, error)
	List(ctx context.Context, organizationID uuid.UUID, status *Status, page, size int) (ListResult, error)
	Update(ctx context.Context, team *Team) (*Team, error)
	SoftDelete(ctx context.Context, id, organizationID uuid.UUID) error
	SoftDeleteMemberByUser(ctx context.Context, organizationID, userID uuid.UUID) error
	ListMembersByUser(ctx context.Context, organizationID, userID uuid.UUID) ([]TeamMember, error)
	ListTeamIDsByUsers(ctx context.Context, organizationID uuid.UUID, userIDs []uuid.UUID) (map[uuid.UUID][]uuid.UUID, error)
	SyncMembersByUser(ctx context.Context, organizationID, userID uuid.UUID, teamIDs []uuid.UUID, defaultRole RoleInTeam) error
}

var (
	ErrNotFound   = errors.New("team not found")
	ErrNameExists = errors.New("team name already in use")
)
