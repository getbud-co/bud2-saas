package domain

import (
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewTimeRange_EndAfterStart_OK(t *testing.T) {
	start := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC)

	tr, err := NewTimeRange(start, end)

	require.NoError(t, err)
	assert.Equal(t, start, tr.Start)
	assert.Equal(t, end, tr.End)
}

func TestNewTimeRange_EndEqualsStart_OK(t *testing.T) {
	// TimeRange is a closed interval [Start, End]; a zero-length range is valid.
	instant := time.Date(2026, 6, 15, 12, 0, 0, 0, time.UTC)

	tr, err := NewTimeRange(instant, instant)

	require.NoError(t, err)
	assert.Equal(t, instant, tr.Start)
	assert.Equal(t, instant, tr.End)
}

func TestNewTimeRange_EndBeforeStart_ReturnsValidationError(t *testing.T) {
	start := time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)

	tr, err := NewTimeRange(start, end)

	require.Error(t, err)
	assert.True(t, errors.Is(err, ErrValidation), "must wrap ErrValidation so the boundary maps to 422")
	assert.Contains(t, err.Error(), "end_date must be on or after start_date")
	assert.Equal(t, TimeRange{}, tr, "failed construction must yield the zero value")
}
