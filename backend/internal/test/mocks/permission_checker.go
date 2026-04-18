package mocks

import "github.com/stretchr/testify/mock"

type PermissionChecker struct {
	mock.Mock
}

func (m *PermissionChecker) Enforce(rvals ...interface{}) (bool, error) {
	args := m.Called(rvals...)
	return args.Bool(0), args.Error(1)
}
