package mocks

import (
	"context"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"

	"github.com/getbud-co/bud2/backend/internal/domain/user"
)

type UserRepository struct {
	mock.Mock
}

func (m *UserRepository) Create(ctx context.Context, u *user.User) (*user.User, error) {
	args := m.Called(ctx, u)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*user.User), args.Error(1)
}

func (m *UserRepository) GetByID(ctx context.Context, id uuid.UUID) (*user.User, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*user.User), args.Error(1)
}

func (m *UserRepository) GetByIDForOrganization(ctx context.Context, id, organizationID uuid.UUID) (*user.User, error) {
	args := m.Called(ctx, id, organizationID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*user.User), args.Error(1)
}

func (m *UserRepository) GetActiveMemberByID(ctx context.Context, id, organizationID uuid.UUID) (*user.User, error) {
	args := m.Called(ctx, id, organizationID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*user.User), args.Error(1)
}

func (m *UserRepository) GetByEmail(ctx context.Context, email string) (*user.User, error) {
	args := m.Called(ctx, email)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*user.User), args.Error(1)
}

func (m *UserRepository) ListByOrganization(ctx context.Context, organizationID uuid.UUID, status *user.Status, page, size int) (user.ListResult, error) {
	args := m.Called(ctx, organizationID, status, page, size)
	return args.Get(0).(user.ListResult), args.Error(1)
}

func (m *UserRepository) Update(ctx context.Context, u *user.User) (*user.User, error) {
	args := m.Called(ctx, u)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*user.User), args.Error(1)
}

func (m *UserRepository) DeleteMembership(ctx context.Context, organizationID, userID uuid.UUID) error {
	args := m.Called(ctx, organizationID, userID)
	return args.Error(0)
}

func (m *UserRepository) ActivateInvitedMemberships(ctx context.Context, userID uuid.UUID) error {
	args := m.Called(ctx, userID)
	return args.Error(0)
}
