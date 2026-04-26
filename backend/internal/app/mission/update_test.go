package mission

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	domainmission "github.com/getbud-co/bud2/backend/internal/domain/mission"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func TestUpdateUseCase_Execute_TransitionToCompleted_SetsCompletedAt(t *testing.T) {
	id := uuid.New()
	tenantID := fixtures.NewTestTenantID()
	now := time.Now()

	repo := new(mocks.MissionRepository)
	repo.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(&domainmission.Mission{
		ID: id, OrganizationID: tenantID.UUID(),
		Title: "x", Status: domainmission.StatusActive, Visibility: domainmission.VisibilityPublic, KanbanStatus: domainmission.KanbanTodo,
	}, nil)
	repo.On("Update", mock.Anything, mock.MatchedBy(func(m *domainmission.Mission) bool {
		return m.Status == domainmission.StatusCompleted && m.CompletedAt != nil
	})).Return(&domainmission.Mission{ID: id, Status: domainmission.StatusCompleted, CompletedAt: &now}, nil)

	uc := NewUpdateUseCase(repo, allowAllRefs(), testutil.NewDiscardLogger())
	m, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID,
		ID:             id,
		Title:          "ok",
		OwnerID:        uuid.New(),
		Status:         "completed",
		Visibility:     "public",
		KanbanStatus:   "done",
	})

	require.NoError(t, err)
	require.NotNil(t, m.CompletedAt)
	repo.AssertExpectations(t)
}

func TestUpdateUseCase_Execute_TransitionAwayFromCompleted_ClearsCompletedAt(t *testing.T) {
	id := uuid.New()
	tenantID := fixtures.NewTestTenantID()
	completedAt := time.Now()

	repo := new(mocks.MissionRepository)
	repo.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(&domainmission.Mission{
		ID: id, OrganizationID: tenantID.UUID(),
		Title: "x", Status: domainmission.StatusCompleted, Visibility: domainmission.VisibilityPublic, KanbanStatus: domainmission.KanbanDone,
		CompletedAt: &completedAt,
	}, nil)
	repo.On("Update", mock.Anything, mock.MatchedBy(func(m *domainmission.Mission) bool {
		return m.Status == domainmission.StatusActive && m.CompletedAt == nil
	})).Return(&domainmission.Mission{ID: id, Status: domainmission.StatusActive}, nil)

	uc := NewUpdateUseCase(repo, allowAllRefs(), testutil.NewDiscardLogger())
	m, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID,
		ID:             id,
		Title:          "ok",
		OwnerID:        uuid.New(),
		Status:         "active",
		Visibility:     "public",
		KanbanStatus:   "doing",
	})

	require.NoError(t, err)
	assert.Nil(t, m.CompletedAt)
}

func TestUpdateUseCase_Execute_RejectsSelfParent(t *testing.T) {
	id := uuid.New()
	tenantID := fixtures.NewTestTenantID()
	repo := new(mocks.MissionRepository)
	repo.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(&domainmission.Mission{
		ID: id, OrganizationID: tenantID.UUID(),
		Title: "x", Status: domainmission.StatusActive, Visibility: domainmission.VisibilityPublic, KanbanStatus: domainmission.KanbanTodo,
	}, nil)

	uc := NewUpdateUseCase(repo, allowAllRefs(), testutil.NewDiscardLogger())
	_, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID, ID: id,
		Title: "x", OwnerID: uuid.New(),
		Status: "active", Visibility: "public", KanbanStatus: "todo",
		ParentID:    &id, // self
		SetParentID: true,
	})

	assert.ErrorIs(t, err, domainmission.ErrInvalidParent)
	repo.AssertNotCalled(t, "Update")
}

func TestUpdateUseCase_Execute_RejectsCycle_WhenNewParentIsDescendant(t *testing.T) {
	id := uuid.New()
	descendantID := uuid.New()
	tenantID := fixtures.NewTestTenantID()
	repo := new(mocks.MissionRepository)
	repo.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(&domainmission.Mission{
		ID: id, OrganizationID: tenantID.UUID(),
		Title: "x", Status: domainmission.StatusActive, Visibility: domainmission.VisibilityPublic, KanbanStatus: domainmission.KanbanTodo,
	}, nil)
	repo.On("GetByID", mock.Anything, descendantID, tenantID.UUID()).Return(&domainmission.Mission{ID: descendantID}, nil)
	repo.On("IsDescendant", mock.Anything, tenantID.UUID(), id, descendantID).Return(true, nil)

	uc := NewUpdateUseCase(repo, allowAllRefs(), testutil.NewDiscardLogger())
	_, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID, ID: id,
		Title: "x", OwnerID: uuid.New(),
		Status: "active", Visibility: "public", KanbanStatus: "todo",
		ParentID:    &descendantID,
		SetParentID: true,
	})

	assert.ErrorIs(t, err, domainmission.ErrInvalidParent)
	repo.AssertNotCalled(t, "Update")
}

func TestUpdateUseCase_Execute_AttachToParent_FromRoot_Succeeds(t *testing.T) {
	id := uuid.New()
	parentID := uuid.New()
	tenantID := fixtures.NewTestTenantID()
	repo := new(mocks.MissionRepository)
	// existing is a root (ParentID nil)
	repo.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(&domainmission.Mission{
		ID: id, OrganizationID: tenantID.UUID(),
		Title: "x", Status: domainmission.StatusActive, Visibility: domainmission.VisibilityPublic, KanbanStatus: domainmission.KanbanTodo,
	}, nil)
	// new parent exists in same org
	repo.On("GetByID", mock.Anything, parentID, tenantID.UUID()).Return(&domainmission.Mission{ID: parentID}, nil)
	// not a descendant
	repo.On("IsDescendant", mock.Anything, tenantID.UUID(), id, parentID).Return(false, nil)
	// update succeeds with new parent
	repo.On("Update", mock.Anything, mock.MatchedBy(func(m *domainmission.Mission) bool {
		return m.ParentID != nil && *m.ParentID == parentID
	})).Return(&domainmission.Mission{ID: id, ParentID: &parentID}, nil)

	uc := NewUpdateUseCase(repo, allowAllRefs(), testutil.NewDiscardLogger())
	got, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID, ID: id,
		Title: "x", OwnerID: uuid.New(),
		Status: "active", Visibility: "public", KanbanStatus: "todo",
		ParentID:    &parentID,
		SetParentID: true,
	})

	require.NoError(t, err)
	require.NotNil(t, got.ParentID)
	assert.Equal(t, parentID, *got.ParentID)
	repo.AssertExpectations(t)
}

func TestUpdateUseCase_Execute_DetachToRoot_FromParent_SkipsIsDescendant(t *testing.T) {
	id := uuid.New()
	currentParent := uuid.New()
	tenantID := fixtures.NewTestTenantID()
	repo := new(mocks.MissionRepository)
	// existing has a parent
	repo.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(&domainmission.Mission{
		ID: id, OrganizationID: tenantID.UUID(), ParentID: &currentParent,
		Title: "x", Status: domainmission.StatusActive, Visibility: domainmission.VisibilityPublic, KanbanStatus: domainmission.KanbanTodo,
	}, nil)
	repo.On("Update", mock.Anything, mock.MatchedBy(func(m *domainmission.Mission) bool {
		return m.ParentID == nil
	})).Return(&domainmission.Mission{ID: id, ParentID: nil}, nil)

	uc := NewUpdateUseCase(repo, allowAllRefs(), testutil.NewDiscardLogger())
	got, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID, ID: id,
		Title: "x", OwnerID: uuid.New(),
		Status: "active", Visibility: "public", KanbanStatus: "todo",
		ParentID:    nil, // detach
		SetParentID: true,
	})

	require.NoError(t, err)
	assert.Nil(t, got.ParentID)
	// move-to-root must not call parent lookup or descendant check
	repo.AssertNumberOfCalls(t, "GetByID", 1)
	repo.AssertNotCalled(t, "IsDescendant")
}

func TestUpdateUseCase_Execute_ParentUnchanged_SkipsValidation(t *testing.T) {
	id := uuid.New()
	parentID := uuid.New()
	tenantID := fixtures.NewTestTenantID()
	repo := new(mocks.MissionRepository)
	repo.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(&domainmission.Mission{
		ID: id, OrganizationID: tenantID.UUID(), ParentID: &parentID,
		Title: "x", Status: domainmission.StatusActive, Visibility: domainmission.VisibilityPublic, KanbanStatus: domainmission.KanbanTodo,
	}, nil)
	repo.On("Update", mock.Anything, mock.Anything).Return(&domainmission.Mission{ID: id, ParentID: &parentID}, nil)

	uc := NewUpdateUseCase(repo, allowAllRefs(), testutil.NewDiscardLogger())
	_, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID, ID: id,
		Title: "x", OwnerID: uuid.New(),
		Status: "active", Visibility: "public", KanbanStatus: "todo",
		ParentID:    &parentID, // same as existing
		SetParentID: true,
	})

	require.NoError(t, err)
	// only the initial GetByID call; no parent lookup, no IsDescendant
	repo.AssertNumberOfCalls(t, "GetByID", 1)
	repo.AssertNotCalled(t, "IsDescendant")
}

func TestUpdateUseCase_Execute_ParentIDOmitted_PreservesExistingParent(t *testing.T) {
	id := uuid.New()
	currentParent := uuid.New()
	tenantID := fixtures.NewTestTenantID()
	repo := new(mocks.MissionRepository)
	repo.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(&domainmission.Mission{
		ID: id, OrganizationID: tenantID.UUID(), ParentID: &currentParent,
		Title: "old", Status: domainmission.StatusActive, Visibility: domainmission.VisibilityPublic, KanbanStatus: domainmission.KanbanTodo,
	}, nil)
	repo.On("Update", mock.Anything, mock.MatchedBy(func(m *domainmission.Mission) bool {
		// Parent must NOT have been touched even though the command's ParentID is nil.
		return m.ParentID != nil && *m.ParentID == currentParent && m.Title == "new"
	})).Return(&domainmission.Mission{ID: id, ParentID: &currentParent, Title: "new"}, nil)

	uc := NewUpdateUseCase(repo, allowAllRefs(), testutil.NewDiscardLogger())
	got, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID, ID: id,
		Title: "new", OwnerID: uuid.New(),
		Status: "active", Visibility: "public", KanbanStatus: "todo",
		// SetParentID intentionally false (default zero value), ParentID nil
	})

	require.NoError(t, err)
	require.NotNil(t, got.ParentID, "omitted parent_id must not detach the mission")
	assert.Equal(t, currentParent, *got.ParentID)
	// No parent lookup, no descendant check.
	repo.AssertNumberOfCalls(t, "GetByID", 1)
	repo.AssertNotCalled(t, "IsDescendant")
}

func TestUpdateUseCase_Execute_OwnerChange_CrossTenant_ReturnsInvalidReference(t *testing.T) {
	id := uuid.New()
	originalOwner := uuid.New()
	newOwner := uuid.New()
	tenantID := fixtures.NewTestTenantID()
	repo := new(mocks.MissionRepository)
	repo.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(&domainmission.Mission{
		ID: id, OrganizationID: tenantID.UUID(), OwnerID: originalOwner,
		Title: "x", Status: domainmission.StatusActive, Visibility: domainmission.VisibilityPublic, KanbanStatus: domainmission.KanbanTodo,
	}, nil)
	refs := new(mocks.MissionReferenceChecker)
	refs.On("CheckUserInOrg", mock.Anything, newOwner, mock.Anything).Return(domainmission.ErrInvalidReference)

	uc := NewUpdateUseCase(repo, refs, testutil.NewDiscardLogger())
	_, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID, ID: id,
		Title: "x", OwnerID: newOwner,
		Status: "active", Visibility: "public", KanbanStatus: "todo",
	})

	assert.ErrorIs(t, err, domainmission.ErrInvalidReference)
	repo.AssertNotCalled(t, "Update")
}

func TestUpdateUseCase_Execute_OwnerUnchanged_SkipsRefCheck(t *testing.T) {
	id := uuid.New()
	owner := uuid.New()
	tenantID := fixtures.NewTestTenantID()
	repo := new(mocks.MissionRepository)
	repo.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(&domainmission.Mission{
		ID: id, OrganizationID: tenantID.UUID(), OwnerID: owner,
		Title: "old", Status: domainmission.StatusActive, Visibility: domainmission.VisibilityPublic, KanbanStatus: domainmission.KanbanTodo,
	}, nil)
	repo.On("Update", mock.Anything, mock.Anything).Return(&domainmission.Mission{ID: id, OwnerID: owner}, nil)
	refs := new(mocks.MissionReferenceChecker)
	// Intentionally NO refs.On("CheckUserInOrg", ...) — must not be called.

	uc := NewUpdateUseCase(repo, refs, testutil.NewDiscardLogger())
	_, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID, ID: id,
		Title: "new", OwnerID: owner,
		Status: "active", Visibility: "public", KanbanStatus: "todo",
	})

	require.NoError(t, err)
	refs.AssertNotCalled(t, "CheckUserInOrg")
}

func TestUpdateUseCase_Execute_NotFound_PropagatesError(t *testing.T) {
	repo := new(mocks.MissionRepository)
	repo.On("GetByID", mock.Anything, mock.Anything, mock.Anything).Return(nil, domainmission.ErrNotFound)

	uc := NewUpdateUseCase(repo, allowAllRefs(), testutil.NewDiscardLogger())
	_, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		ID:             uuid.New(),
		Title:          "ok",
		OwnerID:        uuid.New(),
		Status:         "active",
		Visibility:     "public",
		KanbanStatus:   "todo",
	})

	assert.ErrorIs(t, err, domainmission.ErrNotFound)
	repo.AssertNotCalled(t, "Update")
}
