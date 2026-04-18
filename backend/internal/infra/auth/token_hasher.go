package auth

import (
	"crypto/sha256"
	"encoding/hex"

	domainauth "github.com/getbud-co/bud2/backend/internal/domain/auth"
)

// SHA256TokenHasher implements domain/auth.TokenHasher using SHA-256.
type SHA256TokenHasher struct{}

func NewSHA256TokenHasher() *SHA256TokenHasher {
	return &SHA256TokenHasher{}
}

func (h *SHA256TokenHasher) Hash(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

// Ensure *SHA256TokenHasher satisfies the domain interface at compile time.
var _ domainauth.TokenHasher = (*SHA256TokenHasher)(nil)
