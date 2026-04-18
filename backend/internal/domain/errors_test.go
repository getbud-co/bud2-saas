package domain

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestErrValidation(t *testing.T) {
	assert.True(t, errors.Is(ErrValidation, ErrValidation))
}
