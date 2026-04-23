package mocks

import (
	"context"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"

	"github.com/getbud-co/bud2/backend/internal/domain/team"
)

type TeamRepository struct {
	mock.Mock
}

func (m *TeamRepository) Create(ctx context.Context, t *team.Team) (*team.Team, error) {
	args := m.Called(ctx, t)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*team.Team), args.Error(1)
}

func (m *TeamRepository) GetByID(ctx context.Context, id, organizationID uuid.UUID) (*team.Team, error) {
	args := m.Called(ctx, id, organizationID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*team.Team), args.Error(1)
}

func (m *TeamRepository) GetByName(ctx context.Context, organizationID uuid.UUID, name string) (*team.Team, error) {
	args := m.Called(ctx, organizationID, name)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*team.Team), args.Error(1)
}

func (m *TeamRepository) List(ctx context.Context, organizationID uuid.UUID, status *team.Status, page, size int) (team.ListResult, error) {
	args := m.Called(ctx, organizationID, status, page, size)
	return args.Get(0).(team.ListResult), args.Error(1)
}

func (m *TeamRepository) Update(ctx context.Context, t *team.Team) (*team.Team, error) {
	args := m.Called(ctx, t)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*team.Team), args.Error(1)
}

func (m *TeamRepository) SoftDelete(ctx context.Context, id, organizationID uuid.UUID) error {
	args := m.Called(ctx, id, organizationID)
	return args.Error(0)
}

func (m *TeamRepository) SoftDeleteMemberByUser(ctx context.Context, organizationID, userID uuid.UUID) error {
	args := m.Called(ctx, organizationID, userID)
	return args.Error(0)
}

func (m *TeamRepository) ListMembersByUser(ctx context.Context, organizationID, userID uuid.UUID) ([]team.TeamMember, error) {
	args := m.Called(ctx, organizationID, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]team.TeamMember), args.Error(1)
}

func (m *TeamRepository) ListTeamIDsByUsers(ctx context.Context, organizationID uuid.UUID, userIDs []uuid.UUID) (map[uuid.UUID][]uuid.UUID, error) {
	args := m.Called(ctx, organizationID, userIDs)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(map[uuid.UUID][]uuid.UUID), args.Error(1)
}

func (m *TeamRepository) SyncMembersByUser(ctx context.Context, organizationID, userID uuid.UUID, teamIDs []uuid.UUID, defaultRole team.RoleInTeam) error {
	args := m.Called(ctx, organizationID, userID, teamIDs, defaultRole)
	return args.Error(0)
}
