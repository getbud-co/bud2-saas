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

func (o *Organization) Validate() error {
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
	ErrNotFound        = errors.New("organization not found")
	ErrDomainExists    = errors.New("organization domain already exists")
	ErrWorkspaceExists = errors.New("organization workspace already exists")
)
