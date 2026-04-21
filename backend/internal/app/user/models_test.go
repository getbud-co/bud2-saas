package user

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestEmailDomain_TrimsAndLowercases(t *testing.T) {
	assert.Equal(t, "example.com", emailDomain("  USER@Example.com  "))
	assert.Empty(t, emailDomain("invalid"))
}
