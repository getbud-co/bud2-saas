package auth

import (
	"fmt"

	"golang.org/x/crypto/bcrypt"

	"github.com/getbud-co/bud2/backend/internal/domain/auth"
)

// BcryptPasswordHasher implements domain/auth.PasswordHasher using bcrypt.
type BcryptPasswordHasher struct {
	cost int
}

// NewBcryptPasswordHasher creates a new BcryptPasswordHasher with the specified cost.
// Recommended cost is 10-12 for production.
func NewBcryptPasswordHasher(cost int) *BcryptPasswordHasher {
	return &BcryptPasswordHasher{cost: cost}
}

// NewDefaultBcryptPasswordHasher creates a BcryptPasswordHasher with default cost (12).
func NewDefaultBcryptPasswordHasher() *BcryptPasswordHasher {
	return NewBcryptPasswordHasher(12)
}

// Hash generates a bcrypt hash from a plain text password.
func (h *BcryptPasswordHasher) Hash(password string) (string, error) {
	if password == "" {
		return "", fmt.Errorf("password cannot be empty")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), h.cost)
	if err != nil {
		return "", fmt.Errorf("failed to hash password: %w", err)
	}

	return string(hash), nil
}

// Verify compares a plain text password with a bcrypt hash.
func (h *BcryptPasswordHasher) Verify(password, hash string) bool {
	if password == "" || hash == "" {
		return false
	}

	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// Compile-time check that BcryptPasswordHasher implements PasswordHasher interface.
var _ auth.PasswordHasher = (*BcryptPasswordHasher)(nil)
