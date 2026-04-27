package mocks

import (
	"context"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"

	"github.com/getbud-co/bud2/backend/internal/domain/indicator"
)

type IndicatorRepository struct {
	mock.Mock
}

func (m *IndicatorRepository) Create(ctx context.Context, i *indicator.Indicator) (*indicator.Indicator, error) {
	args := m.Called(ctx, i)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*indicator.Indicator), args.Error(1)
}

func (m *IndicatorRepository) GetByID(ctx context.Context, id, organizationID uuid.UUID) (*indicator.Indicator, error) {
	args := m.Called(ctx, id, organizationID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*indicator.Indicator), args.Error(1)
}

func (m *IndicatorRepository) List(ctx context.Context, filter indicator.ListFilter) (indicator.ListResult, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).(indicator.ListResult), args.Error(1)
}

func (m *IndicatorRepository) Update(ctx context.Context, i *indicator.Indicator) (*indicator.Indicator, error) {
	args := m.Called(ctx, i)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*indicator.Indicator), args.Error(1)
}

func (m *IndicatorRepository) SoftDelete(ctx context.Context, id, organizationID uuid.UUID) error {
	args := m.Called(ctx, id, organizationID)
	return args.Error(0)
}
