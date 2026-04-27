package mission

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domaincycle "github.com/getbud-co/bud2/backend/internal/domain/cycle"
	domainmission "github.com/getbud-co/bud2/backend/internal/domain/mission"
	domainteam "github.com/getbud-co/bud2/backend/internal/domain/team"
	domainuser "github.com/getbud-co/bud2/backend/internal/domain/user"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

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
	return NewCreateUseCase(d.missions, d.cycles, d.teams, d.users, testutil.NewDiscardLogger())
}

func TestCreateUseCase_Execute_Success_AppliesDefaults(t *testing.T) {
	d := newMissionDeps().allowOwner()
	d.missions.On("Create", mock.Anything, mock.MatchedBy(func(m *domainmission.Mission) bool {
		return m.Status == domainmission.StatusDraft &&
			m.Visibility == domainmission.VisibilityPublic &&
			m.KanbanStatus == domainmission.KanbanUncategorized
	})).Return(&domainmission.Mission{ID: uuid.New(), Title: "Reduzir churn", Status: domainmission.StatusDraft, Visibility: domainmission.VisibilityPublic, KanbanStatus: domainmission.KanbanUncategorized}, nil)

	m, err := d.newCreateUseCase().Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		Title:          "Reduzir churn",
		OwnerID:        uuid.New(),
	})

	require.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, m.ID)
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
