package mission

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"

	"github.com/getbud-co/bud2/backend/internal/domain"
)

var (
	validStart = time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	validEnd   = time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC)
)

func validMission() *Mission {
	return &Mission{
		Title:        "Reduzir churn",
		Status:       StatusActive,
		Visibility:   VisibilityPublic,
		KanbanStatus: KanbanTodo,
		StartDate:    validStart,
		EndDate:      validEnd,
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
		UserID: uuid.New(),
		Role:   MemberRoleSupporter,
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
