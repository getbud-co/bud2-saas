package user

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
	"github.com/getbud-co/bud2/backend/internal/domain/membership"
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
	Name          string
	Email         string
	PasswordHash  string
	Status        Status
	IsSystemAdmin bool
	Memberships   []membership.Membership
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

func (u *User) Validate() error {
	if u.Name == "" {
		return fmt.Errorf("%w: name is required", domain.ErrValidation)
	}
	if u.Email == "" {
		return fmt.Errorf("%w: email is required", domain.ErrValidation)
	}
	if !u.Status.IsValid() {
		return fmt.Errorf("%w: status must be active or inactive", domain.ErrValidation)
	}
	for i := range u.Memberships {
		if err := u.Memberships[i].Validate(); err != nil {
			return err
		}
	}
	return nil
}

type ListFilter struct {
	Status *Status
	Search *string
	Page   int
	Size   int
}

type ListResult struct {
	Users []User
	Total int64
}

type Repository interface {
	Create(ctx context.Context, user *User) (*User, error)
	GetByID(ctx context.Context, id uuid.UUID) (*User, error)
	GetByEmail(ctx context.Context, email string) (*User, error)
	List(ctx context.Context, filter ListFilter) (ListResult, error)
	ListByOrganization(ctx context.Context, organizationID uuid.UUID, status *Status, page, size int) (ListResult, error)
	Update(ctx context.Context, user *User) (*User, error)
}

func (u *User) MembershipForOrganization(organizationID uuid.UUID) (*membership.Membership, error) {
	for i := range u.Memberships {
		if u.Memberships[i].OrganizationID == organizationID {
			return &u.Memberships[i], nil
		}
	}
	return nil, membership.ErrNotFound
}

// EnsureAccessibleInOrganization makes the tenant-scope check explicit for
// use cases that return a User but must still enforce organization isolation.
func (u *User) EnsureAccessibleInOrganization(organizationID uuid.UUID) error {
	_, err := u.MembershipForOrganization(organizationID)
	return err
}

func (u *User) AddMembership(m membership.Membership) error {
	if m.UserID != uuid.Nil && m.UserID != u.ID {
		return fmt.Errorf("%w: membership user_id does not match user", domain.ErrValidation)
	}
	if _, err := u.MembershipForOrganization(m.OrganizationID); err == nil {
		return membership.ErrAlreadyExists
	} else if !errors.Is(err, membership.ErrNotFound) {
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
