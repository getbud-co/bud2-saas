package user

import (
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/getbud-co/bud2/backend/internal/domain"
)

func TestStatus_IsValid(t *testing.T) {
	tests := []struct {
		name     string
		status   Status
		expected bool
	}{
		{"active is valid", StatusActive, true},
		{"inactive is valid", StatusInactive, true},
		{"invalid status", Status("invalid"), false},
		{"empty status", Status(""), false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expected, tt.status.IsValid())
		})
	}
}

func TestUser_Validate(t *testing.T) {
	tests := []struct {
		name        string
		user        User
		expectedErr error
	}{
		{
			name: "valid user",
			user: User{
				Name:   "Test User",
				Email:  "test@example.com",
				Status: StatusActive,
			},
			expectedErr: nil,
		},
		{
			name: "missing name",
			user: User{
				Name:   "",
				Email:  "test@example.com",
				Status: StatusActive,
			},
			expectedErr: domain.ErrValidation,
		},
		{
			name: "missing email",
			user: User{
				Name:   "Test User",
				Email:  "",
				Status: StatusActive,
			},
			expectedErr: domain.ErrValidation,
		},
		{
			name: "invalid status",
			user: User{
				Name:   "Test User",
				Email:  "test@example.com",
				Status: Status("invalid"),
			},
			expectedErr: domain.ErrValidation,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.user.Validate()
			if tt.expectedErr != nil {
				assert.ErrorIs(t, err, tt.expectedErr)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}
