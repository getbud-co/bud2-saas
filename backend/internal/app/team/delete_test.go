package team

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	apptx "github.com/getbud-co/bud2/backend/internal/app/tx"
	domainindicator "github.com/getbud-co/bud2/backend/internal/domain/indicator"
	domainmission "github.com/getbud-co/bud2/backend/internal/domain/mission"
	domainorg "github.com/getbud-co/bud2/backend/internal/domain/organization"
	domaintask "github.com/getbud-co/bud2/backend/internal/domain/task"
	domainteam "github.com/getbud-co/bud2/backend/internal/domain/team"
	domainuser "github.com/getbud-co/bud2/backend/internal/domain/user"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

type deleteTeamTxRepos struct {
	teamRepo domainteam.Repository
}

func (r deleteTeamTxRepos) Organizations() domainorg.Repository    { return nil }
func (r deleteTeamTxRepos) Users() domainuser.Repository           { return nil }
func (r deleteTeamTxRepos) Teams() domainteam.Repository           { return r.teamRepo }
func (r deleteTeamTxRepos) Missions() domainmission.Repository     { return nil }
func (r deleteTeamTxRepos) Indicators() domainindicator.Repository { return nil }
func (r deleteTeamTxRepos) Tasks() domaintask.Repository           { return nil }

type deleteTeamTxManager struct {
	repos apptx.Repositories
}

func (m deleteTeamTxManager) WithTx(_ context.Context, fn func(repos apptx.Repositories) error) error {
	return fn(m.repos)
}

func TestDeleteUseCase_Execute_Success(t *testing.T) {
	teamRepo := new(mocks.TeamRepository)
	txm := deleteTeamTxManager{repos: deleteTeamTxRepos{teamRepo: teamRepo}}
	uc := NewDeleteUseCase(txm, testutil.NewDiscardLogger())

	tenantID := fixtures.NewTestTenantID()
	team := fixtures.NewTeam()
	teamRepo.On("GetByID", mock.Anything, team.ID, tenantID.UUID()).Return(team, nil)
	teamRepo.On("SoftDelete", mock.Anything, team.ID, tenantID.UUID()).Return(nil)

	err := uc.Execute(context.Background(), DeleteCommand{OrganizationID: tenantID, ID: team.ID})

	assert.NoError(t, err)
	teamRepo.AssertExpectations(t)
}

func TestDeleteUseCase_Execute_NotFound(t *testing.T) {
	teamRepo := new(mocks.TeamRepository)
	txm := deleteTeamTxManager{repos: deleteTeamTxRepos{teamRepo: teamRepo}}
	uc := NewDeleteUseCase(txm, testutil.NewDiscardLogger())

	tenantID := fixtures.NewTestTenantID()
	id := uuid.New()
	teamRepo.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(nil, domainteam.ErrNotFound)

	err := uc.Execute(context.Background(), DeleteCommand{OrganizationID: tenantID, ID: id})

	assert.ErrorIs(t, err, domainteam.ErrNotFound)
}
