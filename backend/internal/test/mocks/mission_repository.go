package mocks

import (
	"context"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"

	"github.com/getbud-co/bud2/backend/internal/domain/mission"
)

type MissionRepository struct {
	mock.Mock
}

func (m *MissionRepository) Create(ctx context.Context, ms *mission.Mission) (*mission.Mission, error) {
	args := m.Called(ctx, ms)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*mission.Mission), args.Error(1)
}

func (m *MissionRepository) GetByID(ctx context.Context, id, organizationID uuid.UUID) (*mission.Mission, error) {
	args := m.Called(ctx, id, organizationID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*mission.Mission), args.Error(1)
}

func (m *MissionRepository) List(ctx context.Context, filter mission.ListFilter) (mission.ListResult, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).(mission.ListResult), args.Error(1)
}

func (m *MissionRepository) IsDescendant(ctx context.Context, organizationID, ancestorID, candidateID uuid.UUID) (bool, error) {
	args := m.Called(ctx, organizationID, ancestorID, candidateID)
	return args.Bool(0), args.Error(1)
}

func (m *MissionRepository) Update(ctx context.Context, ms *mission.Mission) (*mission.Mission, error) {
	args := m.Called(ctx, ms)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*mission.Mission), args.Error(1)
}

func (m *MissionRepository) SoftDeleteSubtree(ctx context.Context, id, organizationID uuid.UUID) error {
	args := m.Called(ctx, id, organizationID)
	return args.Error(0)
}
