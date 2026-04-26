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
	domainmission "github.com/getbud-co/bud2/backend/internal/domain/mission"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

// allowAllRefs returns a ReferenceChecker mock pre-wired to accept any
// reference. Tests that exercise reference-validation gates set their own.
func allowAllRefs() *mocks.MissionReferenceChecker {
	refs := new(mocks.MissionReferenceChecker)
	refs.On("CheckUserInOrg", mock.Anything, mock.Anything, mock.Anything).Return(nil)
	refs.On("CheckCycleInOrg", mock.Anything, mock.Anything, mock.Anything).Return(nil)
	refs.On("CheckTeamInOrg", mock.Anything, mock.Anything, mock.Anything).Return(nil)
	return refs
}

func TestCreateUseCase_Execute_Success_AppliesDefaults(t *testing.T) {
	repo := new(mocks.MissionRepository)
	uc := NewCreateUseCase(repo, allowAllRefs(), testutil.NewDiscardLogger())

	repo.On("Create", mock.Anything, mock.MatchedBy(func(m *domainmission.Mission) bool {
		return m.Status == domainmission.StatusDraft &&
			m.Visibility == domainmission.VisibilityPublic &&
			m.KanbanStatus == domainmission.KanbanUncategorized
	})).Return(&domainmission.Mission{ID: uuid.New(), Title: "Reduzir churn", Status: domainmission.StatusDraft, Visibility: domainmission.VisibilityPublic, KanbanStatus: domainmission.KanbanUncategorized}, nil)

	m, err := uc.Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		Title:          "Reduzir churn",
		OwnerID:        uuid.New(),
	})

	require.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, m.ID)
	repo.AssertExpectations(t)
	repo.AssertNotCalled(t, "GetByID")
}

func TestCreateUseCase_Execute_EmptyTitle_ReturnsValidationError(t *testing.T) {
	repo := new(mocks.MissionRepository)
	uc := NewCreateUseCase(repo, allowAllRefs(), testutil.NewDiscardLogger())

	_, err := uc.Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		OwnerID:        uuid.New(),
	})

	assert.ErrorIs(t, err, domain.ErrValidation)
	repo.AssertNotCalled(t, "Create")
}

func TestCreateUseCase_Execute_ParentInDifferentOrg_ReturnsInvalidParent(t *testing.T) {
	parentID := uuid.New()
	repo := new(mocks.MissionRepository)
	uc := NewCreateUseCase(repo, allowAllRefs(), testutil.NewDiscardLogger())

	repo.On("GetByID", mock.Anything, parentID, mock.AnythingOfType("uuid.UUID")).Return(nil, domainmission.ErrNotFound)

	_, err := uc.Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		OwnerID:        uuid.New(),
		Title:          "Child",
		ParentID:       &parentID,
	})

	assert.ErrorIs(t, err, domainmission.ErrInvalidParent)
	repo.AssertNotCalled(t, "Create")
}

func TestCreateUseCase_Execute_ParentGetByIDError_PropagatesNonDomainError(t *testing.T) {
	parentID := uuid.New()
	repoErr := errors.New("connection reset")
	repo := new(mocks.MissionRepository)
	repo.On("GetByID", mock.Anything, parentID, mock.Anything).Return(nil, repoErr)

	uc := NewCreateUseCase(repo, allowAllRefs(), testutil.NewDiscardLogger())
	_, err := uc.Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		OwnerID:        uuid.New(),
		Title:          "x",
		ParentID:       &parentID,
	})

	assert.ErrorIs(t, err, repoErr)
	assert.NotErrorIs(t, err, domainmission.ErrInvalidParent, "raw repo errors must not be remapped to InvalidParent")
	repo.AssertNotCalled(t, "Create")
}

func TestCreateUseCase_Execute_OwnerInDifferentOrg_ReturnsInvalidReference(t *testing.T) {
	repo := new(mocks.MissionRepository)
	refs := new(mocks.MissionReferenceChecker)
	refs.On("CheckUserInOrg", mock.Anything, mock.Anything, mock.Anything).Return(domainmission.ErrInvalidReference)

	uc := NewCreateUseCase(repo, refs, testutil.NewDiscardLogger())
	_, err := uc.Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		OwnerID:        uuid.New(),
		Title:          "x",
	})

	assert.ErrorIs(t, err, domainmission.ErrInvalidReference)
	repo.AssertNotCalled(t, "Create")
}

func TestCreateUseCase_Execute_CycleInDifferentOrg_ReturnsInvalidReference(t *testing.T) {
	cycleID := uuid.New()
	repo := new(mocks.MissionRepository)
	refs := new(mocks.MissionReferenceChecker)
	refs.On("CheckUserInOrg", mock.Anything, mock.Anything, mock.Anything).Return(nil)
	refs.On("CheckCycleInOrg", mock.Anything, cycleID, mock.Anything).Return(domainmission.ErrInvalidReference)

	uc := NewCreateUseCase(repo, refs, testutil.NewDiscardLogger())
	_, err := uc.Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		OwnerID:        uuid.New(),
		Title:          "x",
		CycleID:        &cycleID,
	})

	assert.ErrorIs(t, err, domainmission.ErrInvalidReference)
	repo.AssertNotCalled(t, "Create")
}

func TestCreateUseCase_Execute_TeamInDifferentOrg_ReturnsInvalidReference(t *testing.T) {
	teamID := uuid.New()
	repo := new(mocks.MissionRepository)
	refs := new(mocks.MissionReferenceChecker)
	refs.On("CheckUserInOrg", mock.Anything, mock.Anything, mock.Anything).Return(nil)
	refs.On("CheckTeamInOrg", mock.Anything, teamID, mock.Anything).Return(domainmission.ErrInvalidReference)

	uc := NewCreateUseCase(repo, refs, testutil.NewDiscardLogger())
	_, err := uc.Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		OwnerID:        uuid.New(),
		Title:          "x",
		TeamID:         &teamID,
	})

	assert.ErrorIs(t, err, domainmission.ErrInvalidReference)
	repo.AssertNotCalled(t, "Create")
}

func TestCreateUseCase_Execute_RepoError_PropagatesError(t *testing.T) {
	repoErr := errors.New("db down")
	repo := new(mocks.MissionRepository)
	uc := NewCreateUseCase(repo, allowAllRefs(), testutil.NewDiscardLogger())

	repo.On("Create", mock.Anything, mock.Anything).Return(nil, repoErr)

	_, err := uc.Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		OwnerID:        uuid.New(),
		Title:          "ok",
	})

	assert.ErrorIs(t, err, repoErr)
}
