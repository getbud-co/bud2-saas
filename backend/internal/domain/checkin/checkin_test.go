package checkin_test

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/getbud-co/bud2/backend/internal/domain"
	checkin "github.com/getbud-co/bud2/backend/internal/domain/checkin"
)

func TestConfidence_IsValid(t *testing.T) {
	valid := []checkin.Confidence{
		checkin.ConfidenceHigh,
		checkin.ConfidenceMedium,
		checkin.ConfidenceLow,
		checkin.ConfidenceBarrier,
		checkin.ConfidenceDeprioritized,
	}
	for _, c := range valid {
		if !c.IsValid() {
			t.Errorf("expected %q to be valid", c)
		}
	}
	if checkin.Confidence("invalid").IsValid() {
		t.Error("expected 'invalid' to be invalid")
	}
}

func TestCheckIn_Validate(t *testing.T) {
	c := &checkin.CheckIn{Value: "50", Confidence: checkin.ConfidenceHigh}
	if err := c.Validate(); err != nil {
		t.Errorf("expected valid check-in, got %v", err)
	}

	empty := &checkin.CheckIn{Value: "", Confidence: checkin.ConfidenceHigh}
	if err := empty.Validate(); err == nil {
		t.Error("expected error for empty value")
	}

	badConf := &checkin.CheckIn{Value: "50", Confidence: "unknown"}
	if err := badConf.Validate(); err == nil {
		t.Error("expected error for invalid confidence")
	}
}

func TestNewCheckIn_GeneratesIDAndValidates(t *testing.T) {
	orgID := uuid.New()
	indicatorID := uuid.New()
	authorID := uuid.New()

	c, err := checkin.NewCheckIn(orgID, indicatorID, authorID, "75", checkin.ConfidenceHigh)
	require.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, c.ID)
	assert.Equal(t, orgID, c.OrgID)
	assert.Equal(t, indicatorID, c.IndicatorID)
	assert.Equal(t, authorID, c.AuthorID)
	assert.Equal(t, "75", c.Value)
	assert.Equal(t, checkin.ConfidenceHigh, c.Confidence)
}

func TestNewCheckIn_IDIsAlwaysGenerated(t *testing.T) {
	orgID := uuid.New()
	c1, _ := checkin.NewCheckIn(orgID, uuid.New(), uuid.New(), "A", checkin.ConfidenceHigh)
	c2, _ := checkin.NewCheckIn(orgID, uuid.New(), uuid.New(), "B", checkin.ConfidenceMedium)
	assert.NotEqual(t, uuid.Nil, c1.ID)
	assert.NotEqual(t, c1.ID, c2.ID)
}

func TestNewCheckIn_EmptyValue_ReturnsValidationError(t *testing.T) {
	_, err := checkin.NewCheckIn(uuid.New(), uuid.New(), uuid.New(), "", checkin.ConfidenceHigh)
	assert.ErrorIs(t, err, domain.ErrValidation)
}

func TestNewCheckIn_InvalidConfidence_ReturnsValidationError(t *testing.T) {
	_, err := checkin.NewCheckIn(uuid.New(), uuid.New(), uuid.New(), "50", checkin.Confidence("invalid"))
	assert.ErrorIs(t, err, domain.ErrValidation)
}

func TestNewCheckIn_WithPreviousValue_AppliesOption(t *testing.T) {
	prevVal := "50"
	c, err := checkin.NewCheckIn(
		uuid.New(),
		uuid.New(),
		uuid.New(),
		"75",
		checkin.ConfidenceHigh,
		checkin.WithPreviousValue(&prevVal),
	)
	require.NoError(t, err)
	require.NotNil(t, c.PreviousValue)
	assert.Equal(t, "50", *c.PreviousValue)
}

func TestNewCheckIn_WithNote_AppliesOption(t *testing.T) {
	note := "improved performance"
	c, err := checkin.NewCheckIn(
		uuid.New(),
		uuid.New(),
		uuid.New(),
		"80",
		checkin.ConfidenceMedium,
		checkin.WithNote(&note),
	)
	require.NoError(t, err)
	require.NotNil(t, c.Note)
	assert.Equal(t, "improved performance", *c.Note)
}

func TestNewCheckIn_WithMentions_AppliesOption(t *testing.T) {
	mentions := []string{"@alice", "@bob"}
	c, err := checkin.NewCheckIn(
		uuid.New(),
		uuid.New(),
		uuid.New(),
		"85",
		checkin.ConfidenceHigh,
		checkin.WithMentions(mentions),
	)
	require.NoError(t, err)
	assert.Equal(t, mentions, c.Mentions)
}

func TestNewCheckIn_WithMentions_NilNormalizedToEmptySlice(t *testing.T) {
	c, err := checkin.NewCheckIn(
		uuid.New(),
		uuid.New(),
		uuid.New(),
		"90",
		checkin.ConfidenceHigh,
		checkin.WithMentions(nil),
	)
	require.NoError(t, err)
	assert.NotNil(t, c.Mentions)
	assert.Equal(t, 0, len(c.Mentions))
}

func TestCheckIn_UpdateContent_ValidInput_MutatesState(t *testing.T) {
	c, _ := checkin.NewCheckIn(uuid.New(), uuid.New(), uuid.New(), "50", checkin.ConfidenceHigh)
	note := "updated note"

	err := c.UpdateContent("80", checkin.ConfidenceMedium, &note, []string{"@alice"})

	require.NoError(t, err)
	assert.Equal(t, "80", c.Value)
	assert.Equal(t, checkin.ConfidenceMedium, c.Confidence)
	require.NotNil(t, c.Note)
	assert.Equal(t, "updated note", *c.Note)
	assert.Equal(t, []string{"@alice"}, c.Mentions)
}

func TestCheckIn_UpdateContent_EmptyValue_ReturnsErrorAndDoesNotMutate(t *testing.T) {
	c, _ := checkin.NewCheckIn(uuid.New(), uuid.New(), uuid.New(), "50", checkin.ConfidenceHigh)

	err := c.UpdateContent("", checkin.ConfidenceHigh, nil, nil)

	require.Error(t, err)
	assert.ErrorIs(t, err, domain.ErrValidation)
	assert.Equal(t, "50", c.Value, "original value must be preserved")
}

func TestCheckIn_UpdateContent_InvalidConfidence_ReturnsErrorAndDoesNotMutate(t *testing.T) {
	c, _ := checkin.NewCheckIn(uuid.New(), uuid.New(), uuid.New(), "50", checkin.ConfidenceHigh)

	err := c.UpdateContent("60", checkin.Confidence("invalid"), nil, nil)

	require.Error(t, err)
	assert.ErrorIs(t, err, domain.ErrValidation)
	assert.Equal(t, checkin.ConfidenceHigh, c.Confidence, "confidence must be preserved")
}

func TestCheckIn_UpdateContent_NilMentions_NormalizedToEmptySlice(t *testing.T) {
	mentions := []string{"@existing"}
	c, _ := checkin.NewCheckIn(uuid.New(), uuid.New(), uuid.New(), "50", checkin.ConfidenceHigh,
		checkin.WithMentions(mentions),
	)

	err := c.UpdateContent("60", checkin.ConfidenceLow, nil, nil)

	require.NoError(t, err)
	assert.NotNil(t, c.Mentions)
	assert.Empty(t, c.Mentions)
}
