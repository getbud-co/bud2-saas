package domain

import "errors"

// ErrValidation is a sentinel for business validation failures (HTTP 422).
var ErrValidation = errors.New("validation error")
