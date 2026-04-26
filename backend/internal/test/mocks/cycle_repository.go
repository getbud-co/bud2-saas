package mocks

import (
	"context"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"

	"github.com/getbud-co/bud2/backend/internal/domain/cycle"
)

type CycleRepository struct {
	mock.Mock
}

func (m *CycleRepository) Create(ctx context.Context, c *cycle.Cycle) (*cycle.Cycle, error) {
	args := m.Called(ctx, c)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*cycle.Cycle), args.Error(1)
}

func (m *CycleRepository) GetByID(ctx context.Context, id, organizationID uuid.UUID) (*cycle.Cycle, error) {
	args := m.Called(ctx, id, organizationID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*cycle.Cycle), args.Error(1)
}

func (m *CycleRepository) GetByName(ctx context.Context, organizationID uuid.UUID, name string) (*cycle.Cycle, error) {
	args := m.Called(ctx, organizationID, name)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*cycle.Cycle), args.Error(1)
}

func (m *CycleRepository) List(ctx context.Context, organizationID uuid.UUID, status *cycle.Status, page, size int) (cycle.ListResult, error) {
	args := m.Called(ctx, organizationID, status, page, size)
	return args.Get(0).(cycle.ListResult), args.Error(1)
}

func (m *CycleRepository) Update(ctx context.Context, c *cycle.Cycle) (*cycle.Cycle, error) {
	args := m.Called(ctx, c)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*cycle.Cycle), args.Error(1)
}

func (m *CycleRepository) SoftDelete(ctx context.Context, id, organizationID uuid.UUID) error {
	args := m.Called(ctx, id, organizationID)
	return args.Error(0)
}
