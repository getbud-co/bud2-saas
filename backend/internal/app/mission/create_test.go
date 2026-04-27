package mission

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	apptx "github.com/getbud-co/bud2/backend/internal/app/tx"
	"github.com/getbud-co/bud2/backend/internal/domain"
	domaincycle "github.com/getbud-co/bud2/backend/internal/domain/cycle"
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

// nopTxManager runs the closure with the same repos the use case already
// holds, no real transaction. The fast path of CreateUseCase.Execute (no
// children) bypasses the manager entirely, so most tests never touch this.
type nopTxManager struct {
	missions   domainmission.Repository
	indicators domainindicator.Repository
	tasks      domaintask.Repository
}

type nopTxRepos struct {
	missions   domainmission.Repository
	indicators domainindicator.Repository
	tasks      domaintask.Repository
}

func (r nopTxRepos) Organizations() domainorg.Repository           { return nil }
func (r nopTxRepos) Users() domainuser.Repository                  { return nil }
func (r nopTxRepos) Teams() domainteam.Repository                  { return nil }
func (r nopTxRepos) Missions() domainmission.Repository            { return r.missions }
func (r nopTxRepos) Indicators() domainindicator.Repository        { return r.indicators }
func (r nopTxRepos) Tasks() domaintask.Repository                  { return r.tasks }

func (m nopTxManager) WithTx(_ context.Context, fn func(repos apptx.Repositories) error) error {
	return fn(nopTxRepos{missions: m.missions, indicators: m.indicators, tasks: m.tasks})
}

// missionDeps is a tiny holder for the four repos a mission Create/Update
// use case needs. Each test wires only what it cares about.
type missionDeps struct {
	missions *mocks.MissionRepository
	cycles   *mocks.CycleRepository
	teams    *mocks.TeamRepository
	users    *mocks.UserRepository
}

func newMissionDeps() missionDeps {
	return missionDeps{
		missions: new(mocks.MissionRepository),
		cycles:   new(mocks.CycleRepository),
		teams:    new(mocks.TeamRepository),
		users:    new(mocks.UserRepository),
	}
}

// allowOwner pre-wires GetActiveMemberByID to accept any user. Tests that
// validate the gate set their own expectation.
func (d missionDeps) allowOwner() missionDeps {
	d.users.On("GetActiveMemberByID", mock.Anything, mock.Anything, mock.Anything).
		Return(&domainuser.User{ID: uuid.New()}, nil)
	return d
}

func (d missionDeps) newCreateUseCase() *CreateUseCase {
	txm := nopTxManager{missions: d.missions}
	return NewCreateUseCase(d.missions, d.cycles, d.teams, d.users, txm, testutil.NewDiscardLogger())
}

func TestCreateUseCase_Execute_Success_AppliesDefaults(t *testing.T) {
	d := newMissionDeps().allowOwner()
	d.missions.On("Create", mock.Anything, mock.MatchedBy(func(m *domainmission.Mission) bool {
		return m.Status == domainmission.StatusDraft &&
			m.Visibility == domainmission.VisibilityPublic &&
			m.KanbanStatus == domainmission.KanbanUncategorized
	})).Return(&domainmission.Mission{ID: uuid.New(), Title: "Reduzir churn", Status: domainmission.StatusDraft, Visibility: domainmission.VisibilityPublic, KanbanStatus: domainmission.KanbanUncategorized}, nil)

	res, err := d.newCreateUseCase().Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		Title:          "Reduzir churn",
		OwnerID:        uuid.New(),
	})

	require.NoError(t, err)
	require.NotNil(t, res.Mission)
	assert.NotEqual(t, uuid.Nil, res.Mission.ID)
	assert.Empty(t, res.Indicators)
	assert.Empty(t, res.Tasks)
	d.missions.AssertExpectations(t)
	d.missions.AssertNotCalled(t, "GetByID")
}

func TestCreateUseCase_Execute_EmptyTitle_ReturnsValidationError(t *testing.T) {
	d := newMissionDeps().allowOwner()

	_, err := d.newCreateUseCase().Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		OwnerID:        uuid.New(),
	})

	assert.ErrorIs(t, err, domain.ErrValidation)
	d.missions.AssertNotCalled(t, "Create")
}

func TestCreateUseCase_Execute_ParentInDifferentOrg_ReturnsInvalidParent(t *testing.T) {
	parentID := uuid.New()
	d := newMissionDeps().allowOwner()
	d.missions.On("GetByID", mock.Anything, parentID, mock.AnythingOfType("uuid.UUID")).
		Return(nil, domainmission.ErrNotFound)

	_, err := d.newCreateUseCase().Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		OwnerID:        uuid.New(),
		Title:          "Child",
		ParentID:       &parentID,
	})

	assert.ErrorIs(t, err, domainmission.ErrInvalidParent)
	d.missions.AssertNotCalled(t, "Create")
}

func TestCreateUseCase_Execute_ParentGetByIDError_PropagatesNonDomainError(t *testing.T) {
	parentID := uuid.New()
	repoErr := errors.New("connection reset")
	d := newMissionDeps()
	d.missions.On("GetByID", mock.Anything, parentID, mock.Anything).Return(nil, repoErr)

	_, err := d.newCreateUseCase().Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		OwnerID:        uuid.New(),
		Title:          "x",
		ParentID:       &parentID,
	})

	assert.ErrorIs(t, err, repoErr)
	assert.NotErrorIs(t, err, domainmission.ErrInvalidParent, "raw repo errors must not be remapped to InvalidParent")
	d.missions.AssertNotCalled(t, "Create")
}

func TestCreateUseCase_Execute_OwnerNotActiveMember_ReturnsInvalidReference(t *testing.T) {
	d := newMissionDeps()
	d.users.On("GetActiveMemberByID", mock.Anything, mock.Anything, mock.Anything).
		Return(nil, domainuser.ErrNotFound)

	_, err := d.newCreateUseCase().Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		OwnerID:        uuid.New(),
		Title:          "x",
	})

	assert.ErrorIs(t, err, domainmission.ErrInvalidReference)
	d.missions.AssertNotCalled(t, "Create")
}

func TestCreateUseCase_Execute_OwnerLookupGenericError_Propagates(t *testing.T) {
	dbErr := errors.New("conn refused")
	d := newMissionDeps()
	d.users.On("GetActiveMemberByID", mock.Anything, mock.Anything, mock.Anything).
		Return(nil, dbErr)

	_, err := d.newCreateUseCase().Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		OwnerID:        uuid.New(),
		Title:          "x",
	})

	assert.ErrorIs(t, err, dbErr)
	assert.NotErrorIs(t, err, domainmission.ErrInvalidReference, "real DB errors must NOT be remapped")
}

func TestCreateUseCase_Execute_CycleInDifferentOrg_ReturnsInvalidReference(t *testing.T) {
	cycleID := uuid.New()
	d := newMissionDeps().allowOwner()
	d.cycles.On("GetByID", mock.Anything, cycleID, mock.Anything).
		Return(nil, domaincycle.ErrNotFound)

	_, err := d.newCreateUseCase().Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		OwnerID:        uuid.New(),
		Title:          "x",
		CycleID:        &cycleID,
	})

	assert.ErrorIs(t, err, domainmission.ErrInvalidReference)
	d.missions.AssertNotCalled(t, "Create")
}

func TestCreateUseCase_Execute_TeamInDifferentOrg_ReturnsInvalidReference(t *testing.T) {
	teamID := uuid.New()
	d := newMissionDeps().allowOwner()
	d.teams.On("GetByID", mock.Anything, teamID, mock.Anything).
		Return(nil, domainteam.ErrNotFound)

	_, err := d.newCreateUseCase().Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		OwnerID:        uuid.New(),
		Title:          "x",
		TeamID:         &teamID,
	})

	assert.ErrorIs(t, err, domainmission.ErrInvalidReference)
	d.missions.AssertNotCalled(t, "Create")
}

func TestCreateUseCase_Execute_RepoError_PropagatesError(t *testing.T) {
	repoErr := errors.New("db down")
	d := newMissionDeps().allowOwner()
	d.missions.On("Create", mock.Anything, mock.Anything).Return(nil, repoErr)

	_, err := d.newCreateUseCase().Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		OwnerID:        uuid.New(),
		Title:          "ok",
	})

	assert.ErrorIs(t, err, repoErr)
}
