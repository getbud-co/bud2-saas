package mocks

import (
	"context"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"

	"github.com/getbud-co/bud2/backend/internal/domain/task"
)

type TaskRepository struct {
	mock.Mock
}

func (m *TaskRepository) Create(ctx context.Context, t *task.Task) (*task.Task, error) {
	args := m.Called(ctx, t)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*task.Task), args.Error(1)
}

func (m *TaskRepository) GetByID(ctx context.Context, id, organizationID uuid.UUID) (*task.Task, error) {
	args := m.Called(ctx, id, organizationID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*task.Task), args.Error(1)
}

func (m *TaskRepository) List(ctx context.Context, filter task.ListFilter) (task.ListResult, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).(task.ListResult), args.Error(1)
}

func (m *TaskRepository) Update(ctx context.Context, t *task.Task) (*task.Task, error) {
	args := m.Called(ctx, t)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*task.Task), args.Error(1)
}

func (m *TaskRepository) SoftDelete(ctx context.Context, id, organizationID uuid.UUID) error {
	args := m.Called(ctx, id, organizationID)
	return args.Error(0)
}
