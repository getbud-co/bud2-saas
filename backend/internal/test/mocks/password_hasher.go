package mocks

import "github.com/stretchr/testify/mock"

// PasswordHasher is a mock implementation of domain/auth.PasswordHasher
type PasswordHasher struct {
	mock.Mock
}

func (m *PasswordHasher) Hash(password string) (string, error) {
	args := m.Called(password)
	return args.String(0), args.Error(1)
}

func (m *PasswordHasher) Verify(password, hash string) bool {
	args := m.Called(password, hash)
	return args.Bool(0)
}
