package mocks

import (
	"time"

	"github.com/stretchr/testify/mock"

	"github.com/getbud-co/bud2/backend/internal/domain"
)

type TokenIssuer struct {
	mock.Mock
}

func (m *TokenIssuer) IssueToken(claims domain.UserClaims, ttl time.Duration) (string, error) {
	args := m.Called(claims, ttl)
	return args.String(0), args.Error(1)
}
