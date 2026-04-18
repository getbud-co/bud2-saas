package mocks

import "github.com/stretchr/testify/mock"

// TokenHasher is a mock implementation of domain/auth.TokenHasher.
type TokenHasher struct {
	mock.Mock
}

func (m *TokenHasher) Hash(token string) string {
	args := m.Called(token)
	return args.String(0)
}
