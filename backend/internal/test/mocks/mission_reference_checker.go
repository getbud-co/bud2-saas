package mocks

import (
	"context"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"
)

type MissionReferenceChecker struct {
	mock.Mock
}

func (m *MissionReferenceChecker) CheckCycleInOrg(ctx context.Context, cycleID, organizationID uuid.UUID) error {
	args := m.Called(ctx, cycleID, organizationID)
	return args.Error(0)
}

func (m *MissionReferenceChecker) CheckTeamInOrg(ctx context.Context, teamID, organizationID uuid.UUID) error {
	args := m.Called(ctx, teamID, organizationID)
	return args.Error(0)
}

func (m *MissionReferenceChecker) CheckUserInOrg(ctx context.Context, userID, organizationID uuid.UUID) error {
	args := m.Called(ctx, userID, organizationID)
	return args.Error(0)
}
