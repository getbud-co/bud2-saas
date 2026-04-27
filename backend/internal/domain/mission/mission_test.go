package mission

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"

	"github.com/getbud-co/bud2/backend/internal/domain"
)

func TestMission_Validate_Success(t *testing.T) {
	m := &Mission{
		Title:        "Reduzir churn",
		Status:       StatusActive,
		Visibility:   VisibilityPublic,
		KanbanStatus: KanbanTodo,
	}
	assert.NoError(t, m.Validate())
}

func TestMission_Validate_EmptyTitle(t *testing.T) {
	m := &Mission{Title: "", Status: StatusDraft, Visibility: VisibilityPublic, KanbanStatus: KanbanUncategorized}
	assert.ErrorIs(t, m.Validate(), domain.ErrValidation)
}

func TestMission_Validate_DescriptionTooLong(t *testing.T) {
	long := make([]byte, 5001)
	for i := range long {
		long[i] = 'a'
	}
	desc := string(long)
	m := &Mission{
		Title:        "ok",
		Description:  &desc,
		Status:       StatusActive,
		Visibility:   VisibilityPublic,
		KanbanStatus: KanbanTodo,
	}
	assert.ErrorIs(t, m.Validate(), domain.ErrValidation)
}

func TestMission_Validate_DescriptionAt5000_OK(t *testing.T) {
	long := make([]byte, 5000)
	for i := range long {
		long[i] = 'a'
	}
	desc := string(long)
	m := &Mission{
		Title:        "ok",
		Description:  &desc,
		Status:       StatusActive,
		Visibility:   VisibilityPublic,
		KanbanStatus: KanbanTodo,
	}
	assert.NoError(t, m.Validate())
}

func TestMission_Validate_TitleTooLong(t *testing.T) {
	long := make([]byte, 201)
	for i := range long {
		long[i] = 'a'
	}
	m := &Mission{Title: string(long), Status: StatusDraft, Visibility: VisibilityPublic, KanbanStatus: KanbanUncategorized}
	assert.ErrorIs(t, m.Validate(), domain.ErrValidation)
}

func TestMission_Validate_InvalidStatus(t *testing.T) {
	m := &Mission{Title: "ok", Status: Status("bogus"), Visibility: VisibilityPublic, KanbanStatus: KanbanUncategorized}
	assert.ErrorIs(t, m.Validate(), domain.ErrValidation)
}

func TestMission_Validate_InvalidVisibility(t *testing.T) {
	m := &Mission{Title: "ok", Status: StatusActive, Visibility: Visibility("bogus"), KanbanStatus: KanbanUncategorized}
	assert.ErrorIs(t, m.Validate(), domain.ErrValidation)
}

func TestMission_Validate_InvalidKanbanStatus(t *testing.T) {
	m := &Mission{Title: "ok", Status: StatusActive, Visibility: VisibilityPublic, KanbanStatus: KanbanStatus("bogus")}
	assert.ErrorIs(t, m.Validate(), domain.ErrValidation)
}

func TestMission_Validate_CompletedAtRequiresCompletedStatus(t *testing.T) {
	now := time.Now()
	m := &Mission{
		Title:        "ok",
		Status:       StatusActive,
		Visibility:   VisibilityPublic,
		KanbanStatus: KanbanDone,
		CompletedAt:  &now,
	}
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
