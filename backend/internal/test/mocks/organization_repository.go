package mocks

import (
	"context"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"

	"github.com/getbud-co/bud2/backend/internal/domain/organization"
)

type OrganizationRepository struct {
	mock.Mock
}

func (m *OrganizationRepository) Create(ctx context.Context, org *organization.Organization) (*organization.Organization, error) {
	args := m.Called(ctx, org)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*organization.Organization), args.Error(1)
}

func (m *OrganizationRepository) GetByID(ctx context.Context, id uuid.UUID) (*organization.Organization, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*organization.Organization), args.Error(1)
}

func (m *OrganizationRepository) GetByDomain(ctx context.Context, domain string) (*organization.Organization, error) {
	args := m.Called(ctx, domain)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*organization.Organization), args.Error(1)
}

func (m *OrganizationRepository) GetByWorkspace(ctx context.Context, workspace string) (*organization.Organization, error) {
	args := m.Called(ctx, workspace)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*organization.Organization), args.Error(1)
}

func (m *OrganizationRepository) List(ctx context.Context, filter organization.ListFilter) (organization.ListResult, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).(organization.ListResult), args.Error(1)
}

func (m *OrganizationRepository) Update(ctx context.Context, org *organization.Organization) (*organization.Organization, error) {
	args := m.Called(ctx, org)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*organization.Organization), args.Error(1)
}

func (m *OrganizationRepository) CountAll(ctx context.Context) (int64, error) {
	args := m.Called(ctx)
	return args.Get(0).(int64), args.Error(1)
}
