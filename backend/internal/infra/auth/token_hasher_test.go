package auth

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSHA256TokenHasher_Hash_IsDeterministic(t *testing.T) {
	hasher := NewSHA256TokenHasher()

	first := hasher.Hash("refresh-token")
	second := hasher.Hash("refresh-token")

	assert.Equal(t, first, second)
	require.Len(t, first, 64)
}

func TestSHA256TokenHasher_Hash_ChangesWithInput(t *testing.T) {
	hasher := NewSHA256TokenHasher()

	assert.NotEqual(t, hasher.Hash("token-a"), hasher.Hash("token-b"))
}
