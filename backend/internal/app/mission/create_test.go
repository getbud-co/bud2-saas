package mission

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	apptx "github.com/getbud-co/bud2/backend/internal/app/tx"
	"github.com/getbud-co/bud2/backend/internal/domain"
	domainindicator "github.com/getbud-co/bud2/backend/internal/domain/indicator"
	domainmission "github.com/getbud-co/bud2/backend/internal/domain/mission"
	domainorg "github.com/getbud-co/bud2/backend/internal/domain/organization"
	domaintag "github.com/getbud-co/bud2/backend/internal/domain/tag"
	domaintask "github.com/getbud-co/bud2/backend/internal/domain/task"
	domainteam "github.com/getbud-co/bud2/backend/internal/domain/team"
	domainuser "github.com/getbud-co/bud2/backend/internal/domain/user"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

// nopTxManager runs the closure with the same repos the use case already
// holds, no real transaction. The fast path of CreateUseCase.Execute (no
// children) bypasses the manager entirely; nested-create tests use `calls`
// to assert that validation rejects before the manager is touched.
type nopTxManager struct {
	missions   domainmission.Repository
	indicators domainindicator.Repository
	tasks      domaintask.Repository
	calls      int
}

// nopTxRepos returns the same mocks the use case already holds for the
// resources actually used by CreateUseCase, and unconfigured mocks (NOT
// nil) for the rest. An unconfigured mock surfaces a clear testify
// assertion if someone later starts calling, say, repos.Users() inside
// the transaction; nil pointers would manifest as bare panics with
// nothing pointing at the cause.
type nopTxRepos struct {
	missions   domainmission.Repository
	indicators domainindicator.Repository
	tasks      domaintask.Repository
}

func (r nopTxRepos) Organizations() domainorg.Repository    { return new(mocks.OrganizationRepository) }
func (r nopTxRepos) Users() domainuser.Repository           { return new(mocks.UserRepository) }
func (r nopTxRepos) Teams() domainteam.Repository           { return new(mocks.TeamRepository) }
func (r nopTxRepos) Missions() domainmission.Repository     { return r.missions }
func (r nopTxRepos) Indicators() domainindicator.Repository { return r.indicators }
func (r nopTxRepos) Tasks() domaintask.Repository           { return r.tasks }

func (m *nopTxManager) WithTx(_ context.Context, fn func(repos apptx.Repositories) error) error {
	m.calls++
	return fn(nopTxRepos{missions: m.missions, indicators: m.indicators, tasks: m.tasks})
}

// missionDeps is a tiny holder for the repos a mission Create/Update
// use case needs. Each test wires only what it cares about. The nested-create
// path also uses `indicators` and `tasks`; tests that don't exercise that path
// can leave them untouched (newCreateUseCase still wires them, and the
// unconfigured mocks surface clear failures if reached unexpectedly).
type missionDeps struct {
	missions   *mocks.MissionRepository
	tags       *mocks.TagRepository
	teams      *mocks.TeamRepository
	users      *mocks.UserRepository
	indicators *mocks.IndicatorRepository
	tasks      *mocks.TaskRepository
	txm        *nopTxManager
}

func newMissionDeps() missionDeps {
	missions := new(mocks.MissionRepository)
	indicators := new(mocks.IndicatorRepository)
	tasks := new(mocks.TaskRepository)
	return missionDeps{
		missions:   missions,
		tags:       new(mocks.TagRepository),
		teams:      new(mocks.TeamRepository),
		users:      new(mocks.UserRepository),
		indicators: indicators,
		tasks:      tasks,
		txm:        &nopTxManager{missions: missions, indicators: indicators, tasks: tasks},
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
	return NewCreateUseCase(d.missions, d.tags, d.teams, d.users, d.txm, testutil.NewDiscardLogger())
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
		StartDate:      time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		EndDate:        time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC),
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
		StartDate:      time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		EndDate:        time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC),
	})

	assert.ErrorIs(t, err, repoErr)
}

func TestCreateUseCase_Execute_Nested_CallsTxAndCreatesAllChildren(t *testing.T) {
	d := newMissionDeps().allowOwner()

	// Capture the mission's locally-generated ID at call time so the
	// indicator/task matchers can verify children carry the same ID. The
	// use case populates `MissionID` on indicators/tasks from the input
	// mission, before the repo returns.
	var capturedMissionID uuid.UUID
	d.missions.On("Create", mock.Anything, mock.MatchedBy(func(m *domainmission.Mission) bool {
		return m.Title == "Q4 OKRs"
	})).Run(func(args mock.Arguments) {
		capturedMissionID = args.Get(1).(*domainmission.Mission).ID
	}).Return(&domainmission.Mission{ID: uuid.Nil /* will be overwritten below */, Title: "Q4 OKRs"}, nil)

	d.indicators.On("Create", mock.Anything, mock.MatchedBy(func(i *domainindicator.Indicator) bool {
		return i.MissionID == capturedMissionID
	})).Return(&domainindicator.Indicator{ID: uuid.New()}, nil).Twice()

	d.tasks.On("Create", mock.Anything, mock.MatchedBy(func(tk *domaintask.Task) bool {
		return tk.MissionID == capturedMissionID
	})).Return(&domaintask.Task{ID: uuid.New()}, nil).Once()

	res, err := d.newCreateUseCase().Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		OwnerID:        uuid.New(),
		Title:          "Q4 OKRs",
		StartDate:      time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		EndDate:        time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC),
		Indicators: []CreateIndicatorInput{
			{Title: "Churn"},
			{Title: "NPS"},
		},
		Tasks: []CreateTaskInput{
			{Title: "Kickoff"},
		},
	})

	require.NoError(t, err)
	require.NotNil(t, res.Mission)
	assert.NotEqual(t, uuid.Nil, capturedMissionID, "missions.Create must have been called")
	assert.Len(t, res.Indicators, 2)
	assert.Len(t, res.Tasks, 1)
	assert.Equal(t, 1, d.txm.calls, "nested create must run inside a single transaction")
	d.missions.AssertExpectations(t)
	d.indicators.AssertExpectations(t)
	d.tasks.AssertExpectations(t)
}

func TestCreateUseCase_Execute_NestedInvalidIndicatorOwner_RejectsBeforeOpeningTx(t *testing.T) {
	missionOwner := uuid.New()
	bogusOwner := uuid.New()

	d := newMissionDeps()
	d.users.On("GetActiveMemberByID", mock.Anything, missionOwner, mock.Anything).
		Return(&domainuser.User{ID: missionOwner}, nil)
	d.users.On("GetActiveMemberByID", mock.Anything, bogusOwner, mock.Anything).
		Return(nil, domainuser.ErrNotFound)

	_, err := d.newCreateUseCase().Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		OwnerID:        missionOwner,
		Title:          "Should reject",
		StartDate:      time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		EndDate:        time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC),
		Indicators: []CreateIndicatorInput{
			{Title: "valid"},
			{OwnerID: &bogusOwner, Title: "bogus owner — must reject before tx opens"},
		},
	})

	assert.ErrorIs(t, err, domainindicator.ErrInvalidReference)
	assert.Equal(t, 0, d.txm.calls, "validation must reject before tx opens")
	d.missions.AssertNotCalled(t, "Create")
	d.indicators.AssertNotCalled(t, "Create")
	d.tasks.AssertNotCalled(t, "Create")
}

func TestCreateUseCase_Execute_TagIDs_ValidTag_AttachedToMission(t *testing.T) {
	tagID := uuid.New()
	d := newMissionDeps().allowOwner()
	d.tags.On("GetByID", mock.Anything, tagID, mock.AnythingOfType("uuid.UUID")).
		Return(&domaintag.Tag{ID: tagID}, nil)
	d.missions.On("Create", mock.Anything, mock.MatchedBy(func(m *domainmission.Mission) bool {
		return len(m.TagIDs) == 1 && m.TagIDs[0] == tagID
	})).Return(&domainmission.Mission{ID: uuid.New(), Title: "T", Status: domainmission.StatusDraft,
		Visibility: domainmission.VisibilityPublic, KanbanStatus: domainmission.KanbanUncategorized,
		TagIDs: []uuid.UUID{tagID}}, nil)

	res, err := d.newCreateUseCase().Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		Title:          "T",
		OwnerID:        uuid.New(),
		StartDate:      time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		EndDate:        time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC),
		TagIDs:         []uuid.UUID{tagID},
	})

	require.NoError(t, err)
	require.Len(t, res.Mission.TagIDs, 1)
	assert.Equal(t, tagID, res.Mission.TagIDs[0])
}

func TestCreateUseCase_Execute_TagIDs_DuplicatesDeduped(t *testing.T) {
	tagID := uuid.New()
	d := newMissionDeps().allowOwner()
	d.tags.On("GetByID", mock.Anything, tagID, mock.AnythingOfType("uuid.UUID")).
		Return(&domaintag.Tag{ID: tagID}, nil).Once()
	d.missions.On("Create", mock.Anything, mock.MatchedBy(func(m *domainmission.Mission) bool {
		return len(m.TagIDs) == 1
	})).Return(&domainmission.Mission{ID: uuid.New(), Title: "T", Status: domainmission.StatusDraft,
		Visibility: domainmission.VisibilityPublic, KanbanStatus: domainmission.KanbanUncategorized,
		TagIDs: []uuid.UUID{tagID}}, nil)

	_, err := d.newCreateUseCase().Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		Title:          "T",
		OwnerID:        uuid.New(),
		StartDate:      time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		EndDate:        time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC),
		TagIDs:         []uuid.UUID{tagID, tagID},
	})

	require.NoError(t, err)
	d.tags.AssertNumberOfCalls(t, "GetByID", 1)
}

func TestCreateUseCase_Execute_TagIDs_UnknownTag_ReturnsInvalidReference(t *testing.T) {
	tagID := uuid.New()
	d := newMissionDeps().allowOwner()
	d.tags.On("GetByID", mock.Anything, tagID, mock.AnythingOfType("uuid.UUID")).
		Return(nil, domaintag.ErrNotFound)

	_, err := d.newCreateUseCase().Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		Title:          "T",
		OwnerID:        uuid.New(),
		StartDate:      time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		EndDate:        time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC),
		TagIDs:         []uuid.UUID{tagID},
	})

	assert.ErrorIs(t, err, domainmission.ErrInvalidReference)
	d.missions.AssertNotCalled(t, "Create")
}
