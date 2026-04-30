package mocks

import (
	"context"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"

	domaincheckin "github.com/getbud-co/bud2/backend/internal/domain/checkin"
)

type CheckInRepository struct {
	mock.Mock
}

func (m *CheckInRepository) Create(ctx context.Context, c *domaincheckin.CheckIn) (*domaincheckin.CheckIn, error) {
	args := m.Called(ctx, c)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domaincheckin.CheckIn), args.Error(1)
}

func (m *CheckInRepository) GetByID(ctx context.Context, id, orgID uuid.UUID) (*domaincheckin.CheckIn, error) {
	args := m.Called(ctx, id, orgID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domaincheckin.CheckIn), args.Error(1)
}

func (m *CheckInRepository) ListByIndicator(ctx context.Context, orgID, indicatorID uuid.UUID, page, size int) (domaincheckin.ListResult, error) {
	args := m.Called(ctx, orgID, indicatorID, page, size)
	return args.Get(0).(domaincheckin.ListResult), args.Error(1)
}

func (m *CheckInRepository) Update(ctx context.Context, c *domaincheckin.CheckIn) (*domaincheckin.CheckIn, error) {
	args := m.Called(ctx, c)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domaincheckin.CheckIn), args.Error(1)
}

func (m *CheckInRepository) SoftDelete(ctx context.Context, id, orgID uuid.UUID) error {
	args := m.Called(ctx, id, orgID)
	return args.Error(0)
}
