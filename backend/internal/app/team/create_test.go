package team

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	apptx "github.com/getbud-co/bud2/backend/internal/app/tx"
	"github.com/getbud-co/bud2/backend/internal/domain"
	"github.com/getbud-co/bud2/backend/internal/domain/membership"
	domainorg "github.com/getbud-co/bud2/backend/internal/domain/organization"
	domainteam "github.com/getbud-co/bud2/backend/internal/domain/team"
	domainuser "github.com/getbud-co/bud2/backend/internal/domain/user"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

type createTeamTxRepos struct {
	teamRepo domainteam.Repository
	userRepo domainuser.Repository
}

func (r createTeamTxRepos) Organizations() domainorg.Repository { return nil }
func (r createTeamTxRepos) Users() domainuser.Repository        { return r.userRepo }
func (r createTeamTxRepos) Teams() domainteam.Repository        { return r.teamRepo }

type createTeamTxManager struct {
	repos apptx.Repositories
}

func (m createTeamTxManager) WithTx(_ context.Context, fn func(repos apptx.Repositories) error) error {
	return fn(m.repos)
}

func TestCreateUseCase_Execute_Success(t *testing.T) {
	teamRepo := new(mocks.TeamRepository)
	userRepo := new(mocks.UserRepository)
	txm := createTeamTxManager{repos: createTeamTxRepos{teamRepo: teamRepo, userRepo: userRepo}}
	uc := NewCreateUseCase(teamRepo, userRepo, txm, testutil.NewDiscardLogger())

	tenantID := fixtures.NewTestTenantID()
	userID := uuid.New()
	created := fixtures.NewTeam()
	activeUser := fixtures.NewUserWithMembership()
	activeUser.ID = userID
	activeUser.Memberships[0].OrganizationID = tenantID.UUID()
	activeUser.Memberships[0].Status = membership.StatusActive

	teamRepo.On("GetByName", mock.Anything, tenantID.UUID(), "Novo Time").Return(nil, domainteam.ErrNotFound)
	userRepo.On("GetByIDForOrganization", mock.Anything, userID, tenantID.UUID()).Return(activeUser, nil)
	teamRepo.On("Create", mock.Anything, mock.AnythingOfType("*team.Team")).Return(created, nil)

	result, err := uc.Execute(context.Background(), CreateCommand{
		OrganizationID: tenantID,
		Name:           "Novo Time",
		Color:          "neutral",
		Members:        []MemberInput{{UserID: userID, RoleInTeam: "leader"}},
	})

	assert.NoError(t, err)
	assert.Equal(t, created, result)
	teamRepo.AssertExpectations(t)
	userRepo.AssertExpectations(t)
}

func TestCreateUseCase_Execute_NoLeader_ReturnsValidationError(t *testing.T) {
	uc := NewCreateUseCase(nil, nil, createTeamTxManager{}, testutil.NewDiscardLogger())

	_, err := uc.Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		Name:           "Time",
		Color:          "neutral",
		Members:        []MemberInput{{UserID: uuid.New(), RoleInTeam: "member"}},
	})

	assert.ErrorIs(t, err, domain.ErrValidation)
}

func TestCreateUseCase_Execute_DuplicateName_ReturnsConflict(t *testing.T) {
	teamRepo := new(mocks.TeamRepository)
	userRepo := new(mocks.UserRepository)
	txm := createTeamTxManager{repos: createTeamTxRepos{teamRepo: teamRepo, userRepo: userRepo}}
	uc := NewCreateUseCase(teamRepo, userRepo, txm, testutil.NewDiscardLogger())

	tenantID := fixtures.NewTestTenantID()
	teamRepo.On("GetByName", mock.Anything, tenantID.UUID(), "Existente").Return(fixtures.NewTeam(), nil)

	_, err := uc.Execute(context.Background(), CreateCommand{
		OrganizationID: tenantID,
		Name:           "Existente",
		Color:          "neutral",
		Members:        []MemberInput{{UserID: uuid.New(), RoleInTeam: "leader"}},
	})

	assert.ErrorIs(t, err, domainteam.ErrNameExists)
	teamRepo.AssertExpectations(t)
}

func TestCreateUseCase_Execute_UserNotInOrg_ReturnsValidationError(t *testing.T) {
	teamRepo := new(mocks.TeamRepository)
	userRepo := new(mocks.UserRepository)
	txm := createTeamTxManager{repos: createTeamTxRepos{teamRepo: teamRepo, userRepo: userRepo}}
	uc := NewCreateUseCase(teamRepo, userRepo, txm, testutil.NewDiscardLogger())

	tenantID := fixtures.NewTestTenantID()
	userID := uuid.New()
	teamRepo.On("GetByName", mock.Anything, tenantID.UUID(), "Time").Return(nil, domainteam.ErrNotFound)
	userRepo.On("GetByIDForOrganization", mock.Anything, userID, tenantID.UUID()).Return(nil, errors.New("some error"))

	_, err := uc.Execute(context.Background(), CreateCommand{
		OrganizationID: tenantID,
		Name:           "Time",
		Color:          "neutral",
		Members:        []MemberInput{{UserID: userID, RoleInTeam: "leader"}},
	})

	assert.Error(t, err)
}

func TestCreateUseCase_Execute_UserWithoutActiveMembership_ReturnsValidationError(t *testing.T) {
	teamRepo := new(mocks.TeamRepository)
	userRepo := new(mocks.UserRepository)
	txm := createTeamTxManager{repos: createTeamTxRepos{teamRepo: teamRepo, userRepo: userRepo}}
	uc := NewCreateUseCase(teamRepo, userRepo, txm, testutil.NewDiscardLogger())

	tenantID := fixtures.NewTestTenantID()
	userID := uuid.New()
	inactiveUser := fixtures.NewUserWithMembership()
	inactiveUser.ID = userID
	inactiveUser.Memberships[0].OrganizationID = tenantID.UUID()
	inactiveUser.Memberships[0].Status = membership.StatusInactive

	teamRepo.On("GetByName", mock.Anything, tenantID.UUID(), "Time").Return(nil, domainteam.ErrNotFound)
	userRepo.On("GetByIDForOrganization", mock.Anything, userID, tenantID.UUID()).Return(inactiveUser, nil)

	_, err := uc.Execute(context.Background(), CreateCommand{
		OrganizationID: tenantID,
		Name:           "Time",
		Color:          "neutral",
		Members:        []MemberInput{{UserID: userID, RoleInTeam: "leader"}},
	})

	assert.ErrorIs(t, err, domain.ErrValidation)
	teamRepo.AssertNotCalled(t, "Create", mock.Anything, mock.Anything)
}
