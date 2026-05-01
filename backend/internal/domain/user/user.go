package user

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
	"github.com/getbud-co/bud2/backend/internal/domain/organization"
)

type Status string

const (
	StatusActive   Status = "active"
	StatusInactive Status = "inactive"
)

func (s Status) IsValid() bool {
	return s == StatusActive || s == StatusInactive
}

type User struct {
	ID            uuid.UUID
	FirstName     string
	LastName      string
	Email         string
	PasswordHash  string
	Status        Status
	IsSystemAdmin bool
	Nickname      *string
	JobTitle      *string
	BirthDate     *time.Time
	Language      string
	Gender        *string
	Phone         *string
	Memberships   []organization.Membership
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

var validGenders = map[string]bool{
	"feminino": true, "masculino": true, "nao-binario": true, "prefiro-nao-dizer": true,
}

func (u *User) validateInvariants() error {
	if u.FirstName == "" {
		return fmt.Errorf("%w: first_name is required", domain.ErrValidation)
	}
	if u.LastName == "" {
		return fmt.Errorf("%w: last_name is required", domain.ErrValidation)
	}
	if u.Email == "" {
		return fmt.Errorf("%w: email is required", domain.ErrValidation)
	}
	if u.Language == "" {
		return fmt.Errorf("%w: language is required", domain.ErrValidation)
	}
	if !u.Status.IsValid() {
		return fmt.Errorf("%w: status must be active or inactive", domain.ErrValidation)
	}
	if u.Gender != nil && !validGenders[*u.Gender] {
		return fmt.Errorf("%w: gender must be one of: feminino, masculino, nao-binario, prefiro-nao-dizer", domain.ErrValidation)
	}
	minBirth := time.Date(1900, 1, 1, 0, 0, 0, 0, time.UTC)
	if u.BirthDate != nil && (u.BirthDate.Before(minBirth) || u.BirthDate.After(time.Now())) {
		return fmt.Errorf("%w: birth_date must not be in the future and must be after 1900-01-01", domain.ErrValidation)
	}
	for i := range u.Memberships {
		if err := u.Memberships[i].Validate(); err != nil {
			return err
		}
	}
	return nil
}

// Validate is the public invariant check used by repositories post-load and update use cases.
func (u *User) Validate() error {
	return u.validateInvariants()
}

// UserOption configures optional fields on a User during construction.
type UserOption func(*User)

func WithNickname(n *string) UserOption     { return func(u *User) { u.Nickname = n } }
func WithJobTitle(j *string) UserOption     { return func(u *User) { u.JobTitle = j } }
func WithBirthDate(d *time.Time) UserOption { return func(u *User) { u.BirthDate = d } }
func WithLanguage(l string) UserOption      { return func(u *User) { u.Language = l } }
func WithGender(g *string) UserOption       { return func(u *User) { u.Gender = g } }
func WithPhone(p *string) UserOption        { return func(u *User) { u.Phone = p } }

// NewUser constructs an always-valid User. Generates ID, defaults Status to active,
// IsSystemAdmin to false, and Language to "pt-br".
func NewUser(email, firstName, lastName, passwordHash string, opts ...UserOption) (*User, error) {
	u := &User{
		ID:            uuid.New(),
		Email:         email,
		FirstName:     firstName,
		LastName:      lastName,
		PasswordHash:  passwordHash,
		Status:        StatusActive,
		IsSystemAdmin: false,
		Language:      "pt-br",
	}
	for _, opt := range opts {
		opt(u)
	}
	if err := u.validateInvariants(); err != nil {
		return nil, err
	}
	return u, nil
}

type ListResult struct {
	Users []User
	Total int64
}

type Repository interface {
	Create(ctx context.Context, user *User) (*User, error)
	GetByID(ctx context.Context, id uuid.UUID) (*User, error)
	GetByIDForOrganization(ctx context.Context, id, organizationID uuid.UUID) (*User, error)
	// GetActiveMemberByID returns the user only if they exist AND have an
	// active membership in the organization. Used by callers (e.g., mission
	// owner assignment) that must reject users who are merely invited or
	// inactive in the active tenant. Returns ErrNotFound for any of:
	// user does not exist; user has no membership in the org; membership is
	// not active.
	GetActiveMemberByID(ctx context.Context, id, organizationID uuid.UUID) (*User, error)
	GetByEmail(ctx context.Context, email string) (*User, error)
	ListByOrganization(ctx context.Context, organizationID uuid.UUID, status *Status, page, size int) (ListResult, error)
	Update(ctx context.Context, user *User) (*User, error)
	DeleteMembership(ctx context.Context, organizationID, userID uuid.UUID) error
	ActivateInvitedMemberships(ctx context.Context, userID uuid.UUID) error
}

func (u *User) MembershipForOrganization(organizationID uuid.UUID) (*organization.Membership, error) {
	for i := range u.Memberships {
		if u.Memberships[i].OrganizationID == organizationID {
			return &u.Memberships[i], nil
		}
	}
	return nil, organization.ErrMembershipNotFound
}

func (u *User) ActiveMembershipForOrganization(organizationID uuid.UUID) (*organization.Membership, error) {
	m, err := u.MembershipForOrganization(organizationID)
	if err != nil {
		return nil, err
	}
	if m.Status != organization.MembershipStatusActive {
		return nil, organization.ErrMembershipNotFound
	}
	return m, nil
}

// EnsureAccessibleInOrganization makes the tenant-scope check explicit for
// use cases that return a User but must still enforce organization isolation.
func (u *User) EnsureAccessibleInOrganization(organizationID uuid.UUID) error {
	_, err := u.MembershipForOrganization(organizationID)
	return err
}

func (u *User) AddMembership(m organization.Membership) error {
	if m.UserID != uuid.Nil && m.UserID != u.ID {
		return fmt.Errorf("%w: membership user_id does not match user", domain.ErrValidation)
	}
	if _, err := u.MembershipForOrganization(m.OrganizationID); err == nil {
		return organization.ErrMembershipAlreadyExists
	} else if !errors.Is(err, organization.ErrMembershipNotFound) {
		return err
	}
	m.UserID = u.ID
	u.Memberships = append(u.Memberships, m)
	return nil
}

var (
	ErrNotFound    = errors.New("user not found")
	ErrEmailExists = errors.New("email already in use")
)
