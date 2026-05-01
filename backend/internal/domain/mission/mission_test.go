package mission

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/getbud-co/bud2/backend/internal/domain"
)

var (
	validStart = time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	validEnd   = time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC)
)

func validMission() *Mission {
	return &Mission{
		ID:             uuid.New(),
		OrganizationID: uuid.New(),
		OwnerID:        uuid.New(),
		Title:          "Reduzir churn",
		Status:         StatusActive,
		Visibility:     VisibilityPublic,
		KanbanStatus:   KanbanTodo,
		StartDate:      validStart,
		EndDate:        validEnd,
	}
}

func TestMission_Validate_Success(t *testing.T) {
	assert.NoError(t, validMission().Validate())
}

func TestMission_Validate_EmptyTitle(t *testing.T) {
	m := validMission()
	m.Title = ""
	assert.ErrorIs(t, m.Validate(), domain.ErrValidation)
}

func TestMission_Validate_MissingID(t *testing.T) {
	m := validMission()
	m.ID = uuid.Nil
	assert.ErrorIs(t, m.Validate(), domain.ErrValidation)
}

func TestMission_Validate_MissingOrganizationID(t *testing.T) {
	m := validMission()
	m.OrganizationID = uuid.Nil
	assert.ErrorIs(t, m.Validate(), domain.ErrValidation)
}

func TestMission_Validate_MissingOwnerID(t *testing.T) {
	m := validMission()
	m.OwnerID = uuid.Nil
	assert.ErrorIs(t, m.Validate(), domain.ErrValidation)
}

func TestMission_Validate_ParentIDEqualsID(t *testing.T) {
	m := validMission()
	m.ParentID = &m.ID
	assert.ErrorIs(t, m.Validate(), domain.ErrValidation)
}

func TestMission_Validate_DescriptionTooLong(t *testing.T) {
	long := make([]byte, 5001)
	for i := range long {
		long[i] = 'a'
	}
	desc := string(long)
	m := validMission()
	m.Description = &desc
	assert.ErrorIs(t, m.Validate(), domain.ErrValidation)
}

func TestMission_Validate_DescriptionAt5000_OK(t *testing.T) {
	long := make([]byte, 5000)
	for i := range long {
		long[i] = 'a'
	}
	desc := string(long)
	m := validMission()
	m.Description = &desc
	assert.NoError(t, m.Validate())
}

func TestMission_Validate_TitleTooLong(t *testing.T) {
	long := make([]byte, 201)
	for i := range long {
		long[i] = 'a'
	}
	m := validMission()
	m.Title = string(long)
	assert.ErrorIs(t, m.Validate(), domain.ErrValidation)
}

func TestMission_Validate_InvalidStatus(t *testing.T) {
	m := validMission()
	m.Status = Status("bogus")
	assert.ErrorIs(t, m.Validate(), domain.ErrValidation)
}

func TestMission_Validate_InvalidVisibility(t *testing.T) {
	m := validMission()
	m.Visibility = Visibility("bogus")
	assert.ErrorIs(t, m.Validate(), domain.ErrValidation)
}

func TestMission_Validate_InvalidKanbanStatus(t *testing.T) {
	m := validMission()
	m.KanbanStatus = KanbanStatus("bogus")
	assert.ErrorIs(t, m.Validate(), domain.ErrValidation)
}

func TestMission_Validate_ZeroStartDate_ReturnsValidationError(t *testing.T) {
	m := validMission()
	m.StartDate = time.Time{}
	assert.ErrorIs(t, m.Validate(), domain.ErrValidation)
}

func TestMission_Validate_ZeroEndDate_ReturnsValidationError(t *testing.T) {
	m := validMission()
	m.EndDate = time.Time{}
	assert.ErrorIs(t, m.Validate(), domain.ErrValidation)
}

func TestMission_Validate_EndDateBeforeStartDate_ReturnsValidationError(t *testing.T) {
	m := validMission()
	m.StartDate = time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC)
	m.EndDate = time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	assert.ErrorIs(t, m.Validate(), domain.ErrValidation)
}

func TestMission_Validate_EndDateEqualsStartDate_OK(t *testing.T) {
	m := validMission()
	m.EndDate = m.StartDate
	assert.NoError(t, m.Validate())
}

func TestMission_Validate_CompletedAtRequiresCompletedStatus(t *testing.T) {
	now := time.Now()
	m := validMission()
	m.Status = StatusActive
	m.CompletedAt = &now
	assert.ErrorIs(t, m.Validate(), domain.ErrValidation)
}

func TestMemberRole_IsValid(t *testing.T) {
	for _, r := range []MemberRole{MemberRoleOwner, MemberRoleSupporter, MemberRoleObserver} {
		assert.True(t, r.IsValid(), "expected %q to be valid", r)
	}
	assert.False(t, MemberRole("admin").IsValid())
	assert.False(t, MemberRole("").IsValid())
}

func validMember() Member {
	return Member{
		OrganizationID: uuid.New(),
		MissionID:      uuid.New(),
		UserID:         uuid.New(),
		Role:           MemberRoleSupporter,
	}
}

func TestMember_Validate_Success(t *testing.T) {
	m := validMember()
	assert.NoError(t, m.Validate())
}

func TestMember_Validate_MissingUserID(t *testing.T) {
	m := validMember()
	m.UserID = uuid.Nil
	assert.ErrorIs(t, m.Validate(), domain.ErrValidation)
}

func TestMember_Validate_MissingOrganizationID(t *testing.T) {
	m := validMember()
	m.OrganizationID = uuid.Nil
	assert.ErrorIs(t, m.Validate(), domain.ErrValidation)
}

func TestMember_Validate_MissingMissionID(t *testing.T) {
	m := validMember()
	m.MissionID = uuid.Nil
	assert.ErrorIs(t, m.Validate(), domain.ErrValidation)
}

func TestMember_Validate_InvalidRole(t *testing.T) {
	m := validMember()
	m.Role = MemberRole("god")
	assert.ErrorIs(t, m.Validate(), domain.ErrValidation)
}

func TestMission_Validate_InvalidMember_PropagatesError(t *testing.T) {
	m := validMission()
	bad := validMember()
	bad.Role = MemberRole("unknown")
	m.Members = []Member{bad}
	assert.ErrorIs(t, m.Validate(), domain.ErrValidation)
}

func TestStatusIsValid(t *testing.T) {
	assert.True(t, StatusDraft.IsValid())
	assert.True(t, StatusActive.IsValid())
	assert.True(t, StatusPaused.IsValid())
	assert.True(t, StatusCompleted.IsValid())
	assert.True(t, StatusCancelled.IsValid())
	assert.False(t, Status("nope").IsValid())
}

func TestVisibilityIsValid(t *testing.T) {
	assert.True(t, VisibilityPublic.IsValid())
	assert.True(t, VisibilityTeamOnly.IsValid())
	assert.True(t, VisibilityPrivate.IsValid())
	assert.False(t, Visibility("nope").IsValid())
}

func TestKanbanStatusIsValid(t *testing.T) {
	assert.True(t, KanbanUncategorized.IsValid())
	assert.True(t, KanbanTodo.IsValid())
	assert.True(t, KanbanDoing.IsValid())
	assert.True(t, KanbanDone.IsValid())
	assert.False(t, KanbanStatus("nope").IsValid())
}

func validPeriod() domain.TimeRange {
	r, _ := domain.NewTimeRange(validStart, validEnd)
	return r
}

func TestNewMission_AppliesDefaults(t *testing.T) {
	orgID := uuid.New()
	ownerID := uuid.New()
	m, err := NewMission(orgID, ownerID, "Reduzir churn", validPeriod())
	require.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, m.ID)
	assert.Equal(t, StatusDraft, m.Status)
	assert.Equal(t, VisibilityPublic, m.Visibility)
	assert.Equal(t, KanbanUncategorized, m.KanbanStatus)
	assert.Equal(t, orgID, m.OrganizationID)
	assert.Equal(t, ownerID, m.OwnerID)
	assert.Equal(t, validStart, m.StartDate)
	assert.Equal(t, validEnd, m.EndDate)
}

func TestNewMission_OptionsOverrideDefaults(t *testing.T) {
	m, err := NewMission(uuid.New(), uuid.New(), "T", validPeriod(),
		WithStatus(StatusActive),
		WithVisibility(VisibilityPrivate),
		WithKanbanStatus(KanbanDoing),
	)
	require.NoError(t, err)
	assert.Equal(t, StatusActive, m.Status)
	assert.Equal(t, VisibilityPrivate, m.Visibility)
	assert.Equal(t, KanbanDoing, m.KanbanStatus)
}

func TestNewMission_EmptyTitle_ReturnsValidationError(t *testing.T) {
	_, err := NewMission(uuid.New(), uuid.New(), "", validPeriod())
	assert.ErrorIs(t, err, domain.ErrValidation)
}

func TestNewMission_MissingOrganizationID_ReturnsValidationError(t *testing.T) {
	_, err := NewMission(uuid.Nil, uuid.New(), "T", validPeriod())
	assert.ErrorIs(t, err, domain.ErrValidation)
}

func TestNewMission_MissingOwnerID_ReturnsValidationError(t *testing.T) {
	_, err := NewMission(uuid.New(), uuid.Nil, "T", validPeriod())
	assert.ErrorIs(t, err, domain.ErrValidation)
}

func TestNewMission_IDIsAlwaysGenerated(t *testing.T) {
	m1, _ := NewMission(uuid.New(), uuid.New(), "A", validPeriod())
	m2, _ := NewMission(uuid.New(), uuid.New(), "B", validPeriod())
	assert.NotEqual(t, uuid.Nil, m1.ID)
	assert.NotEqual(t, uuid.Nil, m2.ID)
	assert.NotEqual(t, m1.ID, m2.ID)
}

func TestNewMission_MembersPropagateIDs(t *testing.T) {
	orgID := uuid.New()
	members := []Member{
		{UserID: uuid.New(), Role: MemberRoleSupporter},
		{UserID: uuid.New(), Role: MemberRoleObserver},
	}
	m, err := NewMission(orgID, uuid.New(), "T", validPeriod(), WithMembers(members))
	require.NoError(t, err)
	for _, mem := range m.Members {
		assert.Equal(t, m.ID, mem.MissionID, "MissionID must be propagated to members")
		assert.Equal(t, orgID, mem.OrganizationID, "OrganizationID must be propagated to members")
	}
}

func TestNewMission_DuplicateTagIDsDeduped(t *testing.T) {
	tagID := uuid.New()
	m, err := NewMission(uuid.New(), uuid.New(), "T", validPeriod(),
		WithTagIDs([]uuid.UUID{tagID, tagID, tagID}),
	)
	require.NoError(t, err)
	assert.Len(t, m.TagIDs, 1)
}

func TestNewMission_WithParent_SetsParentID(t *testing.T) {
	parentID := uuid.New()
	m, err := NewMission(uuid.New(), uuid.New(), "T", validPeriod(), WithParent(parentID))
	require.NoError(t, err)
	require.NotNil(t, m.ParentID)
	assert.Equal(t, parentID, *m.ParentID)
}

func TestNewMission_WithParentMatchingID_ReturnsValidationError(t *testing.T) {
	m, err := NewMission(uuid.New(), uuid.New(), "T", validPeriod())
	require.NoError(t, err)
	m.ParentID = &m.ID
	assert.ErrorIs(t, m.Validate(), domain.ErrValidation)
}

func TestMission_ChangeStatus_SetsAndClearsCompletedAt(t *testing.T) {
	m := validMission()
	now := time.Date(2026, 3, 10, 12, 0, 0, 0, time.UTC)

	require.NoError(t, m.ChangeStatus(StatusCompleted, now))
	require.NotNil(t, m.CompletedAt)
	assert.Equal(t, StatusCompleted, m.Status)
	assert.True(t, m.CompletedAt.Equal(now))

	require.NoError(t, m.ChangeStatus(StatusActive, now.Add(time.Hour)))
	assert.Equal(t, StatusActive, m.Status)
	assert.Nil(t, m.CompletedAt)
}

func TestMission_ReplaceMembers_DeduplicatesDefaultsRoleAndPropagatesIDs(t *testing.T) {
	m := validMission()
	userID := uuid.New()
	otherUserID := uuid.New()

	err := m.ReplaceMembers([]Member{
		{UserID: userID},
		{UserID: userID, Role: MemberRoleObserver},
		{UserID: otherUserID, Role: MemberRoleOwner},
	})

	require.NoError(t, err)
	require.Len(t, m.Members, 2)
	assert.Equal(t, userID, m.Members[0].UserID)
	assert.Equal(t, MemberRoleSupporter, m.Members[0].Role)
	assert.Equal(t, otherUserID, m.Members[1].UserID)
	assert.Equal(t, MemberRoleOwner, m.Members[1].Role)
	for _, member := range m.Members {
		assert.Equal(t, m.OrganizationID, member.OrganizationID)
		assert.Equal(t, m.ID, member.MissionID)
	}
}

func TestMission_ReplaceTagIDs_DeduplicatesPreservingOrder(t *testing.T) {
	m := validMission()
	a := uuid.New()
	b := uuid.New()
	c := uuid.New()

	require.NoError(t, m.ReplaceTagIDs([]uuid.UUID{a, b, a, c, b}))

	assert.Equal(t, []uuid.UUID{a, b, c}, m.TagIDs)
}

func TestMission_MutatorsReturnValidationErrorWithoutChangingAggregate(t *testing.T) {
	t.Run("rename", func(t *testing.T) {
		m := validMission()
		before := *m
		err := m.Rename("")
		assert.ErrorIs(t, err, domain.ErrValidation)
		assert.Equal(t, before, *m)
	})

	t.Run("description", func(t *testing.T) {
		m := validMission()
		before := *m
		long := make([]byte, 5001)
		for i := range long {
			long[i] = 'a'
		}
		desc := string(long)
		err := m.ChangeDescription(&desc)
		assert.ErrorIs(t, err, domain.ErrValidation)
		assert.Equal(t, before, *m)
	})

	t.Run("owner", func(t *testing.T) {
		m := validMission()
		before := *m
		err := m.ChangeOwner(uuid.Nil)
		assert.ErrorIs(t, err, domain.ErrValidation)
		assert.Equal(t, before, *m)
	})

	t.Run("team", func(t *testing.T) {
		m := validMission()
		before := *m
		err := m.AssignTeam(uuid.Nil)
		assert.ErrorIs(t, err, domain.ErrValidation)
		assert.Equal(t, before, *m)
	})

	t.Run("status", func(t *testing.T) {
		m := validMission()
		before := *m
		err := m.ChangeStatus(Status("invalid"), time.Now())
		assert.ErrorIs(t, err, domain.ErrValidation)
		assert.Equal(t, before, *m)
	})

	t.Run("visibility", func(t *testing.T) {
		m := validMission()
		before := *m
		err := m.ChangeVisibility(Visibility("invalid"))
		assert.ErrorIs(t, err, domain.ErrValidation)
		assert.Equal(t, before, *m)
	})

	t.Run("kanban", func(t *testing.T) {
		m := validMission()
		before := *m
		err := m.ChangeKanbanStatus(KanbanStatus("invalid"))
		assert.ErrorIs(t, err, domain.ErrValidation)
		assert.Equal(t, before, *m)
	})

	t.Run("reschedule", func(t *testing.T) {
		m := validMission()
		before := *m
		err := m.Reschedule(domain.TimeRange{Start: time.Time{}, End: validEnd})
		assert.ErrorIs(t, err, domain.ErrValidation)
		assert.Equal(t, before, *m)
	})

	t.Run("members", func(t *testing.T) {
		m := validMission()
		before := *m
		err := m.ReplaceMembers([]Member{{UserID: uuid.Nil, Role: MemberRoleSupporter}})
		assert.ErrorIs(t, err, domain.ErrValidation)
		assert.Equal(t, before, *m)
	})
}
