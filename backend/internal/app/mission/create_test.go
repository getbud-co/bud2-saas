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
	tags       domaintag.Repository
	teams      domainteam.Repository
	users      domainuser.Repository
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
	tags       domaintag.Repository
	teams      domainteam.Repository
	users      domainuser.Repository
	indicators domainindicator.Repository
	tasks      domaintask.Repository
}

func (r nopTxRepos) Organizations() domainorg.Repository    { return new(mocks.OrganizationRepository) }
func (r nopTxRepos) Users() domainuser.Repository           { return r.users }
func (r nopTxRepos) Teams() domainteam.Repository           { return r.teams }
func (r nopTxRepos) Tags() domaintag.Repository             { return r.tags }
func (r nopTxRepos) Missions() domainmission.Repository     { return r.missions }
func (r nopTxRepos) Indicators() domainindicator.Repository { return r.indicators }
func (r nopTxRepos) Tasks() domaintask.Repository           { return r.tasks }

func (m *nopTxManager) WithTx(_ context.Context, fn func(repos apptx.Repositories) error) error {
	m.calls++
	return fn(nopTxRepos{missions: m.missions, tags: m.tags, teams: m.teams, users: m.users, indicators: m.indicators, tasks: m.tasks})
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
		txm:        &nopTxManager{missions: missions, tags: new(mocks.TagRepository), teams: new(mocks.TeamRepository), users: new(mocks.UserRepository), indicators: indicators, tasks: tasks},
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
	d.txm.tags = d.tags
	d.txm.teams = d.teams
	d.txm.users = d.users
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
		Root: MissionInput{
			Title:     "Reduzir churn",
			OwnerID:   uuidPtr(uuid.New()),
			StartDate: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
			EndDate:   time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC),
		},
	})

	require.NoError(t, err)
	require.NotNil(t, res)
	assert.NotEqual(t, uuid.Nil, res.ID)
	assert.Equal(t, 0, d.txm.calls, "simple mission without relations should use fast path")
	d.missions.AssertExpectations(t)
	d.missions.AssertNotCalled(t, "GetByID")
}

func TestCreateUseCase_Execute_EmptyTitle_ReturnsValidationError(t *testing.T) {
	d := newMissionDeps().allowOwner()

	_, err := d.newCreateUseCase().Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		Root: MissionInput{
			OwnerID: uuidPtr(uuid.New()),
		},
	})

	assert.ErrorIs(t, err, domain.ErrValidation)
	d.missions.AssertNotCalled(t, "Create")
}

func TestCreateUseCase_Execute_RootWithoutOwner_ReturnsValidationErrorBeforePersisting(t *testing.T) {
	d := newMissionDeps()

	_, err := d.newCreateUseCase().Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		Root: MissionInput{
			Title:     "x",
			StartDate: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
			EndDate:   time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC),
		},
	})

	assert.ErrorIs(t, err, domain.ErrValidation)
	d.users.AssertNotCalled(t, "GetActiveMemberByID")
	d.missions.AssertNotCalled(t, "Create")
}

func TestCreateUseCase_Execute_ParentInDifferentOrg_ReturnsInvalidParent(t *testing.T) {
	parentID := uuid.New()
	d := newMissionDeps().allowOwner()
	d.missions.On("GetByID", mock.Anything, parentID, mock.AnythingOfType("uuid.UUID")).
		Return(nil, domainmission.ErrNotFound)

	_, err := d.newCreateUseCase().Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		ParentID:       &parentID,
		Root: MissionInput{
			OwnerID: uuidPtr(uuid.New()),
			Title:   "Child",
		},
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
		ParentID:       &parentID,
		Root: MissionInput{
			OwnerID: uuidPtr(uuid.New()),
			Title:   "x",
		},
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
		Root: MissionInput{
			OwnerID: uuidPtr(uuid.New()),
			Title:   "x",
		},
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
		Root: MissionInput{
			OwnerID: uuidPtr(uuid.New()),
			Title:   "x",
		},
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
		Root: MissionInput{
			OwnerID: uuidPtr(uuid.New()),
			Title:   "x",
			TeamID:  &teamID,
		},
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
		Root: MissionInput{
			OwnerID:   uuidPtr(uuid.New()),
			Title:     "ok",
			StartDate: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
			EndDate:   time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC),
		},
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
		Root: MissionInput{
			OwnerID:   uuidPtr(uuid.New()),
			Title:     "Q4 OKRs",
			StartDate: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
			EndDate:   time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC),
			Indicators: []IndicatorInput{
				{Title: "Churn"},
				{Title: "NPS"},
			},
			Tasks: []TaskInput{
				{Title: "Kickoff"},
			},
		},
	})

	require.NoError(t, err)
	require.NotNil(t, res)
	assert.NotEqual(t, uuid.Nil, capturedMissionID, "missions.Create must have been called")
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
		Root: MissionInput{
			OwnerID:   &missionOwner,
			Title:     "Should reject",
			StartDate: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
			EndDate:   time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC),
			Indicators: []IndicatorInput{
				{Title: "valid"},
				{OwnerID: &bogusOwner, Title: "bogus owner — must reject before tx opens"},
			},
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
		Root: MissionInput{
			Title:     "T",
			OwnerID:   uuidPtr(uuid.New()),
			StartDate: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
			EndDate:   time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC),
			TagIDs:    []uuid.UUID{tagID},
		},
	})

	require.NoError(t, err)
	require.Len(t, res.TagIDs, 1)
	assert.Equal(t, tagID, res.TagIDs[0])
	assert.Equal(t, 1, d.txm.calls, "mission tags must be persisted transactionally")
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
		Root: MissionInput{
			Title:     "T",
			OwnerID:   uuidPtr(uuid.New()),
			StartDate: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
			EndDate:   time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC),
			TagIDs:    []uuid.UUID{tagID, tagID},
		},
	})

	require.NoError(t, err)
	d.tags.AssertNumberOfCalls(t, "GetByID", 1)
	assert.Equal(t, 1, d.txm.calls, "mission tags must be persisted transactionally")
}

func TestCreateUseCase_Execute_Members_UsesTransactionAndDomainRoleDefault(t *testing.T) {
	memberID := uuid.New()
	d := newMissionDeps().allowOwner()
	d.users.On("GetActiveMemberByID", mock.Anything, memberID, mock.AnythingOfType("uuid.UUID")).
		Return(&domainuser.User{ID: memberID}, nil)
	d.missions.On("Create", mock.Anything, mock.MatchedBy(func(m *domainmission.Mission) bool {
		return len(m.Members) == 1 &&
			m.Members[0].UserID == memberID &&
			m.Members[0].Role == domainmission.MemberRoleSupporter
	})).Return(&domainmission.Mission{ID: uuid.New(), Title: "T", Status: domainmission.StatusDraft,
		Visibility: domainmission.VisibilityPublic, KanbanStatus: domainmission.KanbanUncategorized,
		Members: []domainmission.Member{{UserID: memberID, Role: domainmission.MemberRoleSupporter}}}, nil)

	_, err := d.newCreateUseCase().Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		Root: MissionInput{
			Title:     "T",
			OwnerID:   uuidPtr(uuid.New()),
			StartDate: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
			EndDate:   time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC),
			Members:   []MemberInput{{UserID: memberID}},
		},
	})

	require.NoError(t, err)
	assert.Equal(t, 1, d.txm.calls, "mission members must be persisted transactionally")
}

func TestCreateUseCase_Execute_TagIDs_UnknownTag_ReturnsInvalidReference(t *testing.T) {
	tagID := uuid.New()
	d := newMissionDeps().allowOwner()
	d.tags.On("GetByID", mock.Anything, tagID, mock.AnythingOfType("uuid.UUID")).
		Return(nil, domaintag.ErrNotFound)

	_, err := d.newCreateUseCase().Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		Root: MissionInput{
			Title:     "T",
			OwnerID:   uuidPtr(uuid.New()),
			StartDate: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
			EndDate:   time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC),
			TagIDs:    []uuid.UUID{tagID},
		},
	})

	assert.ErrorIs(t, err, domainmission.ErrInvalidReference)
	d.missions.AssertNotCalled(t, "Create")
}

// Regression: a mission with a sub-mission carrying its own indicator and
// task must persist the entire tree atomically. Previously the API
// dropped `children`, so the parent saved while the sub-mission, its
// indicator, and its task were silently lost.
func TestCreateUseCase_Execute_Nested_Children_PersistsFullTree(t *testing.T) {
	d := newMissionDeps().allowOwner()

	// Capture inputs (use case-built missions/indicators/tasks); the mock's
	// returned value is irrelevant to the assertions, which inspect the
	// objects passed *into* repo.Create.
	createdMissions := []*domainmission.Mission{}
	d.missions.On("Create", mock.Anything, mock.AnythingOfType("*mission.Mission")).
		Run(func(args mock.Arguments) {
			createdMissions = append(createdMissions, args.Get(1).(*domainmission.Mission))
		}).
		Return(&domainmission.Mission{ID: uuid.New()}, nil)

	createdIndicators := []*domainindicator.Indicator{}
	d.indicators.On("Create", mock.Anything, mock.AnythingOfType("*indicator.Indicator")).
		Run(func(args mock.Arguments) {
			createdIndicators = append(createdIndicators, args.Get(1).(*domainindicator.Indicator))
		}).
		Return(&domainindicator.Indicator{ID: uuid.New()}, nil).Once()

	createdTasks := []*domaintask.Task{}
	d.tasks.On("Create", mock.Anything, mock.AnythingOfType("*task.Task")).
		Run(func(args mock.Arguments) {
			createdTasks = append(createdTasks, args.Get(1).(*domaintask.Task))
		}).
		Return(&domaintask.Task{ID: uuid.New()}, nil).Once()

	parentOwner := uuid.New()
	res, err := d.newCreateUseCase().Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		Root: MissionInput{
			OwnerID:   &parentOwner,
			Title:     "Parent",
			StartDate: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
			EndDate:   time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC),
			Children: []MissionInput{
				{
					Title:     "Sub",
					StartDate: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
					EndDate:   time.Date(2026, 6, 30, 0, 0, 0, 0, time.UTC),
					Indicators: []IndicatorInput{
						{Title: "Sub indicator"},
					},
					Tasks: []TaskInput{
						{Title: "Sub task"},
					},
				},
			},
		},
	})

	require.NoError(t, err)
	require.NotNil(t, res)
	require.Len(t, createdMissions, 2, "parent + 1 sub-mission must be created")
	require.Len(t, createdIndicators, 1)
	require.Len(t, createdTasks, 1)

	parent := createdMissions[0]
	child := createdMissions[1]
	assert.Nil(t, parent.ParentID, "root parent_id must be nil")
	require.NotNil(t, child.ParentID, "child must reference its parent")
	assert.Equal(t, parent.ID, *child.ParentID, "child.parent_id must match parent.id")
	assert.Equal(t, parentOwner, child.OwnerID, "child must inherit parent owner when not provided")

	assert.Equal(t, child.ID, createdIndicators[0].MissionID, "sub indicator must belong to the sub-mission, not the parent")
	assert.Equal(t, child.ID, createdTasks[0].MissionID, "sub task must belong to the sub-mission, not the parent")

	assert.Equal(t, 1, d.txm.calls, "nested tree must persist inside a single transaction")
}

// Reference validation must run for each child too. A bad owner deep in
// the tree must reject the whole request before the transaction opens.
func TestCreateUseCase_Execute_Nested_Children_InvalidOwner_RejectsBeforeOpeningTx(t *testing.T) {
	parentOwner := uuid.New()
	childOwner := uuid.New()

	d := newMissionDeps()
	d.users.On("GetActiveMemberByID", mock.Anything, parentOwner, mock.Anything).
		Return(&domainuser.User{ID: parentOwner}, nil)
	d.users.On("GetActiveMemberByID", mock.Anything, childOwner, mock.Anything).
		Return(nil, domainuser.ErrNotFound)

	_, err := d.newCreateUseCase().Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		Root: MissionInput{
			OwnerID:   &parentOwner,
			Title:     "Parent",
			StartDate: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
			EndDate:   time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC),
			Children: []MissionInput{
				{
					Title:     "Sub",
					OwnerID:   &childOwner,
					StartDate: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
					EndDate:   time.Date(2026, 6, 30, 0, 0, 0, 0, time.UTC),
				},
			},
		},
	})

	assert.ErrorIs(t, err, domainmission.ErrInvalidReference)
	assert.Equal(t, 0, d.txm.calls, "validation must reject before tx opens")
	d.missions.AssertNotCalled(t, "Create")
}

// Grandchildren must persist too: parent → child → grandchild.
func TestCreateUseCase_Execute_Nested_Grandchildren_PersistsRecursively(t *testing.T) {
	d := newMissionDeps().allowOwner()

	createdMissions := []*domainmission.Mission{}
	d.missions.On("Create", mock.Anything, mock.AnythingOfType("*mission.Mission")).
		Run(func(args mock.Arguments) {
			createdMissions = append(createdMissions, args.Get(1).(*domainmission.Mission))
		}).
		Return(&domainmission.Mission{ID: uuid.New()}, nil)

	res, err := d.newCreateUseCase().Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		Root: MissionInput{
			OwnerID:   uuidPtr(uuid.New()),
			Title:     "L0",
			StartDate: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
			EndDate:   time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC),
			Children: []MissionInput{
				{
					Title:     "L1",
					StartDate: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
					EndDate:   time.Date(2026, 6, 30, 0, 0, 0, 0, time.UTC),
					Children: []MissionInput{
						{
							Title:     "L2",
							StartDate: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
							EndDate:   time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC),
						},
					},
				},
			},
		},
	})

	require.NoError(t, err)
	require.NotNil(t, res)
	require.Len(t, createdMissions, 3, "L0 + L1 + L2 must all be created")
	parent := createdMissions[0]
	l1 := createdMissions[1]
	l2 := createdMissions[2]
	require.NotNil(t, l1.ParentID)
	require.NotNil(t, l2.ParentID)
	assert.Equal(t, parent.ID, *l1.ParentID, "L1 must point to L0")
	assert.Equal(t, l1.ID, *l2.ParentID, "L2 must point to L1, not L0")
	assert.Equal(t, 1, d.txm.calls, "tree must persist inside a single transaction")
}
