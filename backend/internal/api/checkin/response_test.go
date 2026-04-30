package checkin

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	domaincheckin "github.com/getbud-co/bud2/backend/internal/domain/checkin"
)

func TestToResponse_AllFields_FormatsCorrectly(t *testing.T) {
	id := uuid.New()
	orgID := uuid.New()
	indicatorID := uuid.New()
	authorID := uuid.New()
	prev := "40"
	note := "on track"
	created := time.Date(2026, 1, 15, 10, 0, 0, 0, time.UTC)
	updated := time.Date(2026, 1, 16, 10, 0, 0, 0, time.UTC)

	c := &domaincheckin.CheckIn{
		ID:            id,
		OrgID:         orgID,
		IndicatorID:   indicatorID,
		AuthorID:      authorID,
		Value:         "75",
		PreviousValue: &prev,
		Confidence:    domaincheckin.ConfidenceHigh,
		Note:          &note,
		Mentions:      []string{"@alice"},
		CreatedAt:     created,
		UpdatedAt:     updated,
	}

	r := toResponse(c)

	assert.Equal(t, id.String(), r.ID)
	assert.Equal(t, orgID.String(), r.OrgID)
	assert.Equal(t, indicatorID.String(), r.IndicatorID)
	assert.Equal(t, authorID.String(), r.AuthorID)
	assert.Equal(t, "75", r.Value)
	require.NotNil(t, r.PreviousValue)
	assert.Equal(t, "40", *r.PreviousValue)
	assert.Equal(t, "high", r.Confidence)
	require.NotNil(t, r.Note)
	assert.Equal(t, "on track", *r.Note)
	assert.Equal(t, []string{"@alice"}, r.Mentions)
	assert.Equal(t, "2026-01-15T10:00:00Z", r.CreatedAt)
	assert.Equal(t, "2026-01-16T10:00:00Z", r.UpdatedAt)
	assert.Nil(t, r.Author)
}

func TestToResponse_WithAuthorName_PopulatesAuthor(t *testing.T) {
	authorID := uuid.New()
	c := &domaincheckin.CheckIn{
		ID:         uuid.New(),
		AuthorID:   authorID,
		Value:      "50",
		Confidence: domaincheckin.ConfidenceMedium,
		Mentions:   []string{},
		AuthorName: &domaincheckin.AuthorName{FirstName: "Ana", LastName: "Silva"},
	}

	r := toResponse(c)

	require.NotNil(t, r.Author)
	assert.Equal(t, "Ana", r.Author.FirstName)
	assert.Equal(t, "Silva", r.Author.LastName)
	assert.Equal(t, authorID.String(), r.Author.ID)
}

func TestToListResponse_PaginatesAndMapsAll(t *testing.T) {
	items := []domaincheckin.CheckIn{
		{ID: uuid.New(), Value: "60", Confidence: domaincheckin.ConfidenceLow, Mentions: []string{}},
		{ID: uuid.New(), Value: "80", Confidence: domaincheckin.ConfidenceHigh, Mentions: []string{}},
	}
	result := domaincheckin.ListResult{CheckIns: items, Total: 10, Page: 2, Size: 2}

	lr := toListResponse(result)

	assert.Len(t, lr.Data, 2)
	assert.Equal(t, int64(10), lr.Total)
	assert.Equal(t, 2, lr.Page)
	assert.Equal(t, 2, lr.Size)
}
