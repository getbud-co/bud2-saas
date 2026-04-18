package auth

// PasswordHasher defines the interface for password hashing operations.
// Implementations should use secure hashing algorithms like bcrypt.
type PasswordHasher interface {
	// Hash generates a hash from a plain text password.
	// Returns an error if the password is empty or hashing fails.
	Hash(password string) (string, error)

	// Verify compares a plain text password with a hash.
	// Returns true if they match, false otherwise.
	Verify(password, hash string) bool
}
