package user

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/getbud-co/bud2/backend/internal/domain"
)

func TestNewUser_GeneratesIDAndDefaults(t *testing.T) {
	u, err := NewUser("a@b.com", "Ana", "Souza", "hash123")
	require.NoError(t, err)
	assert.NotEqual(t, [16]byte{}, u.ID)
	assert.Equal(t, "a@b.com", u.Email)
	assert.Equal(t, "Ana", u.FirstName)
	assert.Equal(t, "Souza", u.LastName)
	assert.Equal(t, StatusActive, u.Status)
	assert.False(t, u.IsSystemAdmin)
	assert.Equal(t, "pt-br", u.Language)
}

func TestNewUser_IDIsUnique(t *testing.T) {
	u1, _ := NewUser("a@b.com", "Ana", "Souza", "h")
	u2, _ := NewUser("a@b.com", "Ana", "Souza", "h")
	assert.NotEqual(t, u1.ID, u2.ID)
}

func TestNewUser_EmptyFirstName_ReturnsValidationError(t *testing.T) {
	_, err := NewUser("a@b.com", "", "Souza", "h")
	assert.ErrorIs(t, err, domain.ErrValidation)
}

func TestNewUser_EmptyEmail_ReturnsValidationError(t *testing.T) {
	_, err := NewUser("", "Ana", "Souza", "h")
	assert.ErrorIs(t, err, domain.ErrValidation)
}

func TestNewUser_WithLanguage_OverridesDefault(t *testing.T) {
	u, err := NewUser("a@b.com", "Ana", "Souza", "h", WithLanguage("en"))
	require.NoError(t, err)
	assert.Equal(t, "en", u.Language)
}

func TestNewUser_WithNickname_SetsField(t *testing.T) {
	nick := "ani"
	u, err := NewUser("a@b.com", "Ana", "Souza", "h", WithNickname(&nick))
	require.NoError(t, err)
	require.NotNil(t, u.Nickname)
	assert.Equal(t, "ani", *u.Nickname)
}

func TestNewUser_WithGender_InvalidValue_ReturnsValidationError(t *testing.T) {
	g := "outro"
	_, err := NewUser("a@b.com", "Ana", "Souza", "h", WithGender(&g))
	assert.ErrorIs(t, err, domain.ErrValidation)
}

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

func ptr(s string) *string           { return &s }
func ptrTime(t time.Time) *time.Time { return &t }

func TestUser_Validate(t *testing.T) {
	tests := []struct {
		name        string
		user        User
		expectedErr error
	}{
		{
			name: "valid user",
			user: User{
				FirstName: "Test",
				LastName:  "User",
				Email:     "test@example.com",
				Language:  "pt-br",
				Status:    StatusActive,
			},
			expectedErr: nil,
		},
		{
			name: "missing first name",
			user: User{
				FirstName: "",
				LastName:  "User",
				Email:     "test@example.com",
				Language:  "pt-br",
				Status:    StatusActive,
			},
			expectedErr: domain.ErrValidation,
		},
		{
			name: "missing last name",
			user: User{
				FirstName: "Test",
				LastName:  "",
				Email:     "test@example.com",
				Language:  "pt-br",
				Status:    StatusActive,
			},
			expectedErr: domain.ErrValidation,
		},
		{
			name: "missing email",
			user: User{
				FirstName: "Test",
				LastName:  "User",
				Email:     "",
				Language:  "pt-br",
				Status:    StatusActive,
			},
			expectedErr: domain.ErrValidation,
		},
		{
			name: "missing language",
			user: User{
				FirstName: "Test",
				LastName:  "User",
				Email:     "test@example.com",
				Language:  "",
				Status:    StatusActive,
			},
			expectedErr: domain.ErrValidation,
		},
		{
			name: "invalid status",
			user: User{
				FirstName: "Test",
				LastName:  "User",
				Email:     "test@example.com",
				Language:  "pt-br",
				Status:    Status("invalid"),
			},
			expectedErr: domain.ErrValidation,
		},
		{
			name: "invalid gender",
			user: User{
				FirstName: "Test",
				LastName:  "User",
				Email:     "test@example.com",
				Language:  "pt-br",
				Status:    StatusActive,
				Gender:    ptr("outro"),
			},
			expectedErr: domain.ErrValidation,
		},
		{
			name: "valid gender",
			user: User{
				FirstName: "Test",
				LastName:  "User",
				Email:     "test@example.com",
				Language:  "pt-br",
				Status:    StatusActive,
				Gender:    ptr("feminino"),
			},
			expectedErr: nil,
		},
		{
			name: "birth_date in the future",
			user: User{
				FirstName: "Test",
				LastName:  "User",
				Email:     "test@example.com",
				Language:  "pt-br",
				Status:    StatusActive,
				BirthDate: ptrTime(time.Now().AddDate(1, 0, 0)),
			},
			expectedErr: domain.ErrValidation,
		},
		{
			name: "birth_date before 1900",
			user: User{
				FirstName: "Test",
				LastName:  "User",
				Email:     "test@example.com",
				Language:  "pt-br",
				Status:    StatusActive,
				BirthDate: ptrTime(time.Date(1899, 12, 31, 0, 0, 0, 0, time.UTC)),
			},
			expectedErr: domain.ErrValidation,
		},
		{
			name: "valid birth_date",
			user: User{
				FirstName: "Test",
				LastName:  "User",
				Email:     "test@example.com",
				Language:  "pt-br",
				Status:    StatusActive,
				BirthDate: ptrTime(time.Date(1990, 6, 15, 0, 0, 0, 0, time.UTC)),
			},
			expectedErr: nil,
		},
		{
			name: "birth_date today is valid",
			user: User{
				FirstName: "Test",
				LastName:  "User",
				Email:     "test@example.com",
				Language:  "pt-br",
				Status:    StatusActive,
				BirthDate: ptrTime(time.Now().Truncate(24 * time.Hour)),
			},
			expectedErr: nil,
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
