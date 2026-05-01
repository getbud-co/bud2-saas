package domain

import (
	"fmt"
	"time"
)

// TimeRange is a value object representing a closed interval [Start, End].
type TimeRange struct{ Start, End time.Time }

// NewTimeRange constructs a TimeRange, rejecting end before start.
func NewTimeRange(start, end time.Time) (TimeRange, error) {
	if end.Before(start) {
		return TimeRange{}, fmt.Errorf("%w: end_date must be on or after start_date", ErrValidation)
	}
	return TimeRange{Start: start, End: end}, nil
}
