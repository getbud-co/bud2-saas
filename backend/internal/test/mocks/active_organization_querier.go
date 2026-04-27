package mocks

import (
	"context"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"

	"github.com/getbud-co/bud2/backend/internal/infra/postgres/sqlc"
)

type ActiveOrganizationQuerier struct {
	mock.Mock
}

func (m *ActiveOrganizationQuerier) GetOrganizationByID(ctx context.Context, id uuid.UUID) (sqlc.GetOrganizationByIDRow, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(sqlc.GetOrganizationByIDRow), args.Error(1)
}

func (m *ActiveOrganizationQuerier) GetActiveOrganizationMembership(ctx context.Context, arg sqlc.GetActiveOrganizationMembershipParams) (sqlc.GetActiveOrganizationMembershipRow, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).(sqlc.GetActiveOrganizationMembershipRow), args.Error(1)
}
