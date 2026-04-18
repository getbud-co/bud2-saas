package fixtures

import (
	"time"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain/membership"
	"github.com/getbud-co/bud2/backend/internal/domain/user"
)

func NewUser() *user.User {
	return &user.User{
		ID:            uuid.MustParse("660e8400-e29b-41d4-a716-446655440000"),
		Name:          "Test User",
		Email:         "test@example.com",
		PasswordHash:  "",
		Status:        user.StatusActive,
		IsSystemAdmin: false,
		CreatedAt:     time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
		UpdatedAt:     time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
	}
}

func NewUserWithEmail(email string) *user.User {
	u := NewUser()
	u.Email = email
	return u
}

func NewSystemAdmin() *user.User {
	u := NewUser()
	u.IsSystemAdmin = true
	return u
}

func NewInactiveUser() *user.User {
	u := NewUser()
	u.Status = user.StatusInactive
	return u
}

func NewUserList(count int) []user.User {
	users := make([]user.User, count)
	for i := 0; i < count; i++ {
		u := NewUser()
		u.ID = uuid.MustParse("660e8400-e29b-41d4-a716-446655440001")
		u.Email = "user" + string(rune('0'+i)) + "@example.com"
		users[i] = *u
	}
	return users
}

func NewUserWithMembership() *user.User {
	u := NewUser()
	u.Memberships = []membership.Membership{*NewMembership()}
	return u
}
