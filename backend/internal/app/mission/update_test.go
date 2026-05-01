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
	domaintag "github.com/getbud-co/bud2/backend/internal/domain/tag"
	domainuser "github.com/getbud-co/bud2/backend/internal/domain/user"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

// strPtr / uuidPtr keep test bodies terse.
func strPtr(s string) *string        { return &s }
func uuidPtr(u uuid.UUID) *uuid.UUID { return &u }

func existingMission(id, orgID uuid.UUID) *domainmission.Mission {
	desc := "old description"
	teamID := uuid.New()
	startDate := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC)
	return &domainmission.Mission{
		ID: id, OrganizationID: orgID,
		Title:        "old title",
		Description:  &desc,
		OwnerID:      uuid.New(),
		TeamID:       &teamID,
		Status:       domainmission.StatusActive,
		Visibility:   domainmission.VisibilityPublic,
		KanbanStatus: domainmission.KanbanTodo,
		StartDate:    startDate,
		EndDate:      endDate,
	}
}

func (d missionDeps) newUpdateUseCase() *UpdateUseCase {
	d.txm.tags = d.tags
	d.txm.teams = d.teams
	d.txm.users = d.users
	return NewUpdateUseCase(d.missions, d.tags, d.teams, d.users, d.txm, testutil.NewDiscardLogger())
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
			m.OwnerID == prev.OwnerID &&
			m.TeamID != nil && *m.TeamID == *prev.TeamID &&
			m.Status == prev.Status &&
			m.Visibility == prev.Visibility &&
			m.KanbanStatus == prev.KanbanStatus &&
			m.StartDate.Equal(prev.StartDate) &&
			m.EndDate.Equal(prev.EndDate)
	})).Return(prev, nil)

	_, err := d.newUpdateUseCase().Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID,
		ID:             id,
		Title:          strPtr("new title"),
	})

	require.NoError(t, err)
	assert.Equal(t, 1, d.txm.calls)
	d.missions.AssertExpectations(t)
	d.users.AssertNotCalled(t, "GetActiveMemberByID")
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

func TestPatch_StartDateNotSent_PreservesExisting(t *testing.T) {
	id := uuid.New()
	tenantID := fixtures.NewTestTenantID()
	prev := existingMission(id, tenantID.UUID())
	expectedStart := prev.StartDate
	d := newMissionDeps()
	d.missions.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(prev, nil)
	d.missions.On("Update", mock.Anything, mock.MatchedBy(func(m *domainmission.Mission) bool {
		return m.StartDate.Equal(expectedStart)
	})).Return(prev, nil)

	_, err := d.newUpdateUseCase().Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID,
		ID:             id,
		Status:         strPtr("paused"),
	})

	require.NoError(t, err)
}

func TestPatch_EndDateNotSent_PreservesExisting(t *testing.T) {
	id := uuid.New()
	tenantID := fixtures.NewTestTenantID()
	prev := existingMission(id, tenantID.UUID())
	expectedEnd := prev.EndDate
	d := newMissionDeps()
	d.missions.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(prev, nil)
	d.missions.On("Update", mock.Anything, mock.MatchedBy(func(m *domainmission.Mission) bool {
		return m.EndDate.Equal(expectedEnd)
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
		OwnerID:        uuidPtr(prev.OwnerID),
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
	assert.Equal(t, 1, d.txm.calls)
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

func TestPatch_MembersProvided_ReplacesWithDedupedNormalizedMembers(t *testing.T) {
	id := uuid.New()
	tenantID := fixtures.NewTestTenantID()
	prev := existingMission(id, tenantID.UUID())
	userID := uuid.New()
	otherUserID := uuid.New()
	d := newMissionDeps()
	d.missions.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(prev, nil)
	d.users.On("GetActiveMemberByID", mock.Anything, userID, tenantID.UUID()).
		Return(&domainuser.User{ID: userID}, nil)
	d.users.On("GetActiveMemberByID", mock.Anything, otherUserID, tenantID.UUID()).
		Return(&domainuser.User{ID: otherUserID}, nil)
	d.missions.On("Update", mock.Anything, mock.MatchedBy(func(m *domainmission.Mission) bool {
		return len(m.Members) == 2 &&
			m.Members[0].UserID == userID &&
			m.Members[0].Role == domainmission.MemberRoleSupporter &&
			m.Members[0].OrganizationID == tenantID.UUID() &&
			m.Members[0].MissionID == id &&
			m.Members[1].UserID == otherUserID &&
			m.Members[1].Role == domainmission.MemberRoleObserver &&
			m.Members[1].OrganizationID == tenantID.UUID() &&
			m.Members[1].MissionID == id
	})).Return(prev, nil)

	members := []MemberInput{
		{UserID: userID},
		{UserID: userID, Role: domainmission.MemberRoleOwner},
		{UserID: otherUserID, Role: domainmission.MemberRoleObserver},
	}
	_, err := d.newUpdateUseCase().Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID,
		ID:             id,
		Members:        &members,
	})

	require.NoError(t, err)
	d.users.AssertExpectations(t)
}

func TestPatch_TagIDsProvided_ReplacesWithDedupedTags(t *testing.T) {
	id := uuid.New()
	tenantID := fixtures.NewTestTenantID()
	prev := existingMission(id, tenantID.UUID())
	tagID := uuid.New()
	otherTagID := uuid.New()
	d := newMissionDeps()
	d.missions.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(prev, nil)
	d.tags.On("GetByID", mock.Anything, tagID, tenantID.UUID()).Return(&domaintag.Tag{ID: tagID}, nil)
	d.tags.On("GetByID", mock.Anything, otherTagID, tenantID.UUID()).Return(&domaintag.Tag{ID: otherTagID}, nil)
	d.missions.On("Update", mock.Anything, mock.MatchedBy(func(m *domainmission.Mission) bool {
		return len(m.TagIDs) == 2 && m.TagIDs[0] == tagID && m.TagIDs[1] == otherTagID
	})).Return(prev, nil)

	tagIDs := []uuid.UUID{tagID, tagID, otherTagID}
	_, err := d.newUpdateUseCase().Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID,
		ID:             id,
		TagIDs:         &tagIDs,
	})

	require.NoError(t, err)
	d.tags.AssertExpectations(t)
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
