package mocks

import (
	"context"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"

	"github.com/getbud-co/bud2/backend/internal/domain/tag"
)

type TagRepository struct {
	mock.Mock
}

func (m *TagRepository) Create(ctx context.Context, t *tag.Tag) (*tag.Tag, error) {
	args := m.Called(ctx, t)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*tag.Tag), args.Error(1)
}

func (m *TagRepository) GetByID(ctx context.Context, id, organizationID uuid.UUID) (*tag.Tag, error) {
	args := m.Called(ctx, id, organizationID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*tag.Tag), args.Error(1)
}

func (m *TagRepository) GetByName(ctx context.Context, organizationID uuid.UUID, name string) (*tag.Tag, error) {
	args := m.Called(ctx, organizationID, name)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*tag.Tag), args.Error(1)
}

func (m *TagRepository) List(ctx context.Context, organizationID uuid.UUID, page, size int) (tag.ListResult, error) {
	args := m.Called(ctx, organizationID, page, size)
	return args.Get(0).(tag.ListResult), args.Error(1)
}

func (m *TagRepository) Update(ctx context.Context, t *tag.Tag) (*tag.Tag, error) {
	args := m.Called(ctx, t)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*tag.Tag), args.Error(1)
}

func (m *TagRepository) SoftDelete(ctx context.Context, id, organizationID uuid.UUID) error {
	args := m.Called(ctx, id, organizationID)
	return args.Error(0)
}
