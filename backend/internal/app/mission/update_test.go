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

	domainmission "github.com/getbud-co/bud2/backend/internal/domain/mission"
	domainuser "github.com/getbud-co/bud2/backend/internal/domain/user"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

// strPtr / uuidPtr / intPtr keep test bodies terse.
func strPtr(s string) *string        { return &s }
func uuidPtr(u uuid.UUID) *uuid.UUID { return &u }
func intPtr(i int) *int              { return &i }

func existingMission(id, orgID uuid.UUID) *domainmission.Mission {
	desc := "old description"
	cycleID := uuid.New()
	teamID := uuid.New()
	due := time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC)
	return &domainmission.Mission{
		ID: id, OrganizationID: orgID,
		Title:        "old title",
		Description:  &desc,
		CycleID:      &cycleID,
		OwnerID:      uuid.New(),
		TeamID:       &teamID,
		Status:       domainmission.StatusActive,
		Visibility:   domainmission.VisibilityPublic,
		KanbanStatus: domainmission.KanbanTodo,
		SortOrder:    3,
		DueDate:      &due,
	}
}

func (d missionDeps) newUpdateUseCase() *UpdateUseCase {
	return NewUpdateUseCase(d.missions, d.cycles, d.teams, d.users, testutil.NewDiscardLogger())
}

func TestPatch_OnlyTitle_PreservesAllOtherFields(t *testing.T) {
	id := uuid.New()
	tenantID := fixtures.NewTestTenantID()
	prev := existingMission(id, tenantID.UUID())
	d := newMissionDeps()
	d.missions.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(prev, nil)
	d.missions.On("Update", mock.Anything, mock.MatchedBy(func(m *domainmission.Mission) bool {
		return m.Title == "new title" &&
			*m.Description == "old description" &&
			m.CycleID != nil && *m.CycleID == *prev.CycleID &&
			m.OwnerID == prev.OwnerID &&
			m.TeamID != nil && *m.TeamID == *prev.TeamID &&
			m.Status == prev.Status &&
			m.Visibility == prev.Visibility &&
			m.KanbanStatus == prev.KanbanStatus &&
			m.SortOrder == prev.SortOrder &&
			m.DueDate != nil && m.DueDate.Equal(*prev.DueDate)
	})).Return(prev, nil)

	_, err := d.newUpdateUseCase().Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID,
		ID:             id,
		Title:          strPtr("new title"),
	})

	require.NoError(t, err)
	d.missions.AssertExpectations(t)
	// No reference change → no calls to other repos.
	d.users.AssertNotCalled(t, "GetActiveMemberByID")
	d.cycles.AssertNotCalled(t, "GetByID")
	d.teams.AssertNotCalled(t, "GetByID")
}

func TestPatch_DescriptionNotSent_PreservesExisting(t *testing.T) {
	id := uuid.New()
	tenantID := fixtures.NewTestTenantID()
	prev := existingMission(id, tenantID.UUID())
	d := newMissionDeps()
	d.missions.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(prev, nil)
	d.missions.On("Update", mock.Anything, mock.MatchedBy(func(m *domainmission.Mission) bool {
		return m.Description != nil && *m.Description == "old description"
	})).Return(prev, nil)

	_, err := d.newUpdateUseCase().Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID,
		ID:             id,
		Title:          strPtr("new title"),
	})

	require.NoError(t, err)
}

func TestPatch_CycleIDNotSent_PreservesExisting(t *testing.T) {
	id := uuid.New()
	tenantID := fixtures.NewTestTenantID()
	prev := existingMission(id, tenantID.UUID())
	expectedCycle := *prev.CycleID
	d := newMissionDeps()
	d.missions.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(prev, nil)
	d.missions.On("Update", mock.Anything, mock.MatchedBy(func(m *domainmission.Mission) bool {
		return m.CycleID != nil && *m.CycleID == expectedCycle
	})).Return(prev, nil)

	_, err := d.newUpdateUseCase().Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID,
		ID:             id,
		Status:         strPtr("paused"),
	})

	require.NoError(t, err)
}

func TestPatch_TeamIDNotSent_PreservesExisting(t *testing.T) {
	id := uuid.New()
	tenantID := fixtures.NewTestTenantID()
	prev := existingMission(id, tenantID.UUID())
	expectedTeam := *prev.TeamID
	d := newMissionDeps()
	d.missions.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(prev, nil)
	d.missions.On("Update", mock.Anything, mock.MatchedBy(func(m *domainmission.Mission) bool {
		return m.TeamID != nil && *m.TeamID == expectedTeam
	})).Return(prev, nil)

	_, err := d.newUpdateUseCase().Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID,
		ID:             id,
		Status:         strPtr("paused"),
	})

	require.NoError(t, err)
}

func TestPatch_DueDateNotSent_PreservesExisting(t *testing.T) {
	id := uuid.New()
	tenantID := fixtures.NewTestTenantID()
	prev := existingMission(id, tenantID.UUID())
	expectedDue := *prev.DueDate
	d := newMissionDeps()
	d.missions.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(prev, nil)
	d.missions.On("Update", mock.Anything, mock.MatchedBy(func(m *domainmission.Mission) bool {
		return m.DueDate != nil && m.DueDate.Equal(expectedDue)
	})).Return(prev, nil)

	_, err := d.newUpdateUseCase().Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID,
		ID:             id,
		Status:         strPtr("paused"),
	})

	require.NoError(t, err)
}

func TestPatch_OwnerChange_TriggersGetActiveMemberByID(t *testing.T) {
	id := uuid.New()
	tenantID := fixtures.NewTestTenantID()
	prev := existingMission(id, tenantID.UUID())
	newOwner := uuid.New()
	d := newMissionDeps()
	d.missions.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(prev, nil)
	d.missions.On("Update", mock.Anything, mock.Anything).Return(prev, nil)
	d.users.On("GetActiveMemberByID", mock.Anything, newOwner, tenantID.UUID()).
		Return(&domainuser.User{ID: newOwner}, nil)

	_, err := d.newUpdateUseCase().Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID,
		ID:             id,
		OwnerID:        uuidPtr(newOwner),
	})

	require.NoError(t, err)
	d.users.AssertExpectations(t)
}

func TestPatch_OwnerUnchanged_SkipsGetActiveMemberByID(t *testing.T) {
	id := uuid.New()
	tenantID := fixtures.NewTestTenantID()
	prev := existingMission(id, tenantID.UUID())
	d := newMissionDeps()
	d.missions.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(prev, nil)
	d.missions.On("Update", mock.Anything, mock.Anything).Return(prev, nil)

	_, err := d.newUpdateUseCase().Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID,
		ID:             id,
		OwnerID:        uuidPtr(prev.OwnerID), // same as existing
	})

	require.NoError(t, err)
	d.users.AssertNotCalled(t, "GetActiveMemberByID")
}

func TestPatch_OwnerNotActiveMember_ReturnsInvalidReference(t *testing.T) {
	id := uuid.New()
	tenantID := fixtures.NewTestTenantID()
	prev := existingMission(id, tenantID.UUID())
	d := newMissionDeps()
	d.missions.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(prev, nil)
	d.users.On("GetActiveMemberByID", mock.Anything, mock.Anything, mock.Anything).
		Return(nil, domainuser.ErrNotFound)

	_, err := d.newUpdateUseCase().Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID,
		ID:             id,
		OwnerID:        uuidPtr(uuid.New()),
	})

	assert.ErrorIs(t, err, domainmission.ErrInvalidReference)
	d.missions.AssertNotCalled(t, "Update")
}

func TestPatch_TransitionToCompleted_SetsCompletedAt(t *testing.T) {
	id := uuid.New()
	tenantID := fixtures.NewTestTenantID()
	prev := existingMission(id, tenantID.UUID())
	prev.Status = domainmission.StatusActive
	prev.CompletedAt = nil
	d := newMissionDeps()
	d.missions.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(prev, nil)
	d.missions.On("Update", mock.Anything, mock.MatchedBy(func(m *domainmission.Mission) bool {
		return m.Status == domainmission.StatusCompleted && m.CompletedAt != nil
	})).Return(prev, nil)

	_, err := d.newUpdateUseCase().Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID,
		ID:             id,
		Status:         strPtr("completed"),
	})

	require.NoError(t, err)
}

func TestPatch_TransitionAwayFromCompleted_ClearsCompletedAt(t *testing.T) {
	id := uuid.New()
	tenantID := fixtures.NewTestTenantID()
	prev := existingMission(id, tenantID.UUID())
	completed := time.Now()
	prev.Status = domainmission.StatusCompleted
	prev.CompletedAt = &completed
	d := newMissionDeps()
	d.missions.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(prev, nil)
	d.missions.On("Update", mock.Anything, mock.MatchedBy(func(m *domainmission.Mission) bool {
		return m.Status == domainmission.StatusActive && m.CompletedAt == nil
	})).Return(prev, nil)

	_, err := d.newUpdateUseCase().Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID,
		ID:             id,
		Status:         strPtr("active"),
	})

	require.NoError(t, err)
}

func TestPatch_NotFound_PropagatesError(t *testing.T) {
	d := newMissionDeps()
	d.missions.On("GetByID", mock.Anything, mock.Anything, mock.Anything).Return(nil, domainmission.ErrNotFound)

	_, err := d.newUpdateUseCase().Execute(context.Background(), UpdateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		ID:             uuid.New(),
		Title:          strPtr("x"),
	})

	assert.ErrorIs(t, err, domainmission.ErrNotFound)
	d.missions.AssertNotCalled(t, "Update")
}

func TestPatch_SortOrder_AppliedAsZero(t *testing.T) {
	// Regression: SortOrder=0 must still be applied when the pointer is non-nil
	// (zero-value vs unset distinction).
	id := uuid.New()
	tenantID := fixtures.NewTestTenantID()
	prev := existingMission(id, tenantID.UUID())
	prev.SortOrder = 99
	d := newMissionDeps()
	d.missions.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(prev, nil)
	d.missions.On("Update", mock.Anything, mock.MatchedBy(func(m *domainmission.Mission) bool {
		return m.SortOrder == 0
	})).Return(prev, nil)

	_, err := d.newUpdateUseCase().Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID,
		ID:             id,
		SortOrder:      intPtr(0),
	})

	require.NoError(t, err)
}

func TestPatch_RepoUpdateError_Propagates(t *testing.T) {
	repoErr := errors.New("db down")
	id := uuid.New()
	tenantID := fixtures.NewTestTenantID()
	prev := existingMission(id, tenantID.UUID())
	d := newMissionDeps()
	d.missions.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(prev, nil)
	d.missions.On("Update", mock.Anything, mock.Anything).Return(nil, repoErr)

	_, err := d.newUpdateUseCase().Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID,
		ID:             id,
		Title:          strPtr("x"),
	})

	assert.ErrorIs(t, err, repoErr)
}
