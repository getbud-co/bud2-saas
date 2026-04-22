package membership

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"

	"github.com/getbud-co/bud2/backend/internal/domain"
)

func TestRole_IsValid(t *testing.T) {
	tests := []struct {
		name     string
		role     Role
		expected bool
	}{
		{"super-admin is valid", RoleSuperAdmin, true},
		{"admin-rh is valid", RoleAdminRH, true},
		{"gestor is valid", RoleGestor, true},
		{"colaborador is valid", RoleColaborador, true},
		{"visualizador is valid", RoleVisualizador, true},
		{"invalid role", Role("invalid"), false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expected, tt.role.IsValid())
		})
	}
}

func TestStatus_IsValid(t *testing.T) {
	tests := []struct {
		name     string
		status   Status
		expected bool
	}{
		{"invited is valid", StatusInvited, true},
		{"active is valid", StatusActive, true},
		{"inactive is valid", StatusInactive, true},
		{"invalid status", Status("invalid"), false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expected, tt.status.IsValid())
		})
	}
}

func TestMembership_Validate(t *testing.T) {
	tests := []struct {
		name        string
		membership  Membership
		expectedErr error
	}{
		{
			name: "valid membership",
			membership: Membership{
				OrganizationID: uuid.New(),
				UserID:         uuid.New(),
				Role:           RoleSuperAdmin,
				Status:         StatusActive,
			},
		},
		{
			name: "missing organization",
			membership: Membership{
				UserID: uuid.New(),
				Role:   RoleSuperAdmin,
				Status: StatusActive,
			},
			expectedErr: domain.ErrValidation,
		},
		{
			name: "missing user",
			membership: Membership{
				OrganizationID: uuid.New(),
				Role:           RoleSuperAdmin,
				Status:         StatusActive,
			},
			expectedErr: domain.ErrValidation,
		},
		{
			name: "invalid role",
			membership: Membership{
				OrganizationID: uuid.New(),
				UserID:         uuid.New(),
				Role:           Role("invalid"),
				Status:         StatusActive,
			},
			expectedErr: domain.ErrValidation,
		},
		{
			name: "invalid status",
			membership: Membership{
				OrganizationID: uuid.New(),
				UserID:         uuid.New(),
				Role:           RoleSuperAdmin,
				Status:         Status("invalid"),
			},
			expectedErr: domain.ErrValidation,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.membership.Validate()
			if tt.expectedErr != nil {
				assert.ErrorIs(t, err, tt.expectedErr)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}
