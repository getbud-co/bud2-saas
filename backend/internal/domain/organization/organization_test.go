package organization

import (
	"testing"

	"github.com/google/uuid"
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

func TestMembershipRole_IsValid(t *testing.T) {
	tests := []struct {
		name     string
		role     MembershipRole
		expected bool
	}{
		{"super-admin is valid", MembershipRoleSuperAdmin, true},
		{"admin-rh is valid", MembershipRoleAdminRH, true},
		{"gestor is valid", MembershipRoleGestor, true},
		{"colaborador is valid", MembershipRoleColaborador, true},
		{"visualizador is valid", MembershipRoleVisualizador, true},
		{"invalid role", MembershipRole("invalid"), false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expected, tt.role.IsValid())
		})
	}
}

func TestMembershipStatus_IsValid(t *testing.T) {
	tests := []struct {
		name     string
		status   MembershipStatus
		expected bool
	}{
		{"invited is valid", MembershipStatusInvited, true},
		{"active is valid", MembershipStatusActive, true},
		{"inactive is valid", MembershipStatusInactive, true},
		{"invalid status", MembershipStatus("invalid"), false},
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
				Role:           MembershipRoleSuperAdmin,
				Status:         MembershipStatusActive,
			},
		},
		{
			name: "missing organization",
			membership: Membership{
				UserID: uuid.New(),
				Role:   MembershipRoleSuperAdmin,
				Status: MembershipStatusActive,
			},
			expectedErr: domain.ErrValidation,
		},
		{
			name: "missing user",
			membership: Membership{
				OrganizationID: uuid.New(),
				Role:           MembershipRoleSuperAdmin,
				Status:         MembershipStatusActive,
			},
			expectedErr: domain.ErrValidation,
		},
		{
			name: "invalid role",
			membership: Membership{
				OrganizationID: uuid.New(),
				UserID:         uuid.New(),
				Role:           MembershipRole("invalid"),
				Status:         MembershipStatusActive,
			},
			expectedErr: domain.ErrValidation,
		},
		{
			name: "invalid status",
			membership: Membership{
				OrganizationID: uuid.New(),
				UserID:         uuid.New(),
				Role:           MembershipRoleSuperAdmin,
				Status:         MembershipStatus("invalid"),
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

func TestNewOrganization_DefaultsStatusActiveAndValidates(t *testing.T) {
	o, err := NewOrganization("Bud Inc", "bud.co", "bud")
	assert.NoError(t, err)
	assert.Equal(t, "Bud Inc", o.Name)
	assert.Equal(t, "bud.co", o.Domain)
	assert.Equal(t, "bud", o.Workspace)
	assert.Equal(t, StatusActive, o.Status)
	assert.Equal(t, uuid.Nil, o.ID) // ID is DB-assigned
}

func TestNewOrganization_WithStatus_AppliesOption(t *testing.T) {
	o, err := NewOrganization("Bud Inc", "bud.co", "bud", WithStatus(StatusInactive))
	assert.NoError(t, err)
	assert.Equal(t, StatusInactive, o.Status)
}

func TestNewOrganization_EmptyName_ReturnsValidationError(t *testing.T) {
	_, err := NewOrganization("", "bud.co", "bud")
	assert.ErrorIs(t, err, domain.ErrValidation)
}

func TestNewOrganization_EmptyDomain_ReturnsValidationError(t *testing.T) {
	_, err := NewOrganization("Bud Inc", "", "bud")
	assert.ErrorIs(t, err, domain.ErrValidation)
}

func TestNewOrganization_InvalidDomainFormat_ReturnsValidationError(t *testing.T) {
	_, err := NewOrganization("Bud Inc", "not a domain", "bud")
	assert.ErrorIs(t, err, domain.ErrValidation)
}

func TestNewOrganization_EmptyWorkspace_ReturnsValidationError(t *testing.T) {
	_, err := NewOrganization("Bud Inc", "bud.co", "")
	assert.ErrorIs(t, err, domain.ErrValidation)
}

func TestNewOrganization_InvalidStatus_ReturnsValidationError(t *testing.T) {
	_, err := NewOrganization("Bud Inc", "bud.co", "bud", WithStatus(Status("unknown")))
	assert.ErrorIs(t, err, domain.ErrValidation)
}

func TestOrganization_Validate(t *testing.T) {
	tests := []struct {
		name        string
		org         Organization
		expectedErr error
	}{
		{
			name: "valid organization",
			org: Organization{
				Name:      "Test Org",
				Domain:    "test.org",
				Workspace: "test-org",
				Status:    StatusActive,
			},
			expectedErr: nil,
		},
		{
			name: "missing name",
			org: Organization{
				Name:      "",
				Domain:    "test.org",
				Workspace: "test-org",
				Status:    StatusActive,
			},
			expectedErr: domain.ErrValidation,
		},
		{
			name: "missing domain",
			org: Organization{
				Name:      "Test Org",
				Domain:    "",
				Workspace: "test-org",
				Status:    StatusActive,
			},
			expectedErr: domain.ErrValidation,
		},
		{
			name: "missing workspace",
			org: Organization{
				Name:      "Test Org",
				Domain:    "test.org",
				Workspace: "",
				Status:    StatusActive,
			},
			expectedErr: domain.ErrValidation,
		},
		{
			name: "invalid domain format",
			org: Organization{
				Name:      "Test Org",
				Domain:    "not a domain",
				Workspace: "test-org",
				Status:    StatusActive,
			},
			expectedErr: domain.ErrValidation,
		},
		{
			name: "invalid status",
			org: Organization{
				Name:      "Test Org",
				Domain:    "test.org",
				Workspace: "test-org",
				Status:    Status("invalid"),
			},
			expectedErr: domain.ErrValidation,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.org.Validate()
			if tt.expectedErr != nil {
				assert.ErrorIs(t, err, tt.expectedErr)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}
