package role

import (
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/getbud-co/bud2/backend/internal/domain/organization"
	"github.com/getbud-co/bud2/backend/internal/domain/permission"
)

func TestType_IsValid(t *testing.T) {
	assert.True(t, TypeSystem.IsValid())
	assert.True(t, TypeCustom.IsValid())
	assert.False(t, Type("other").IsValid())
	assert.False(t, Type("").IsValid())
}

func TestScope_IsValid(t *testing.T) {
	assert.True(t, ScopeSelf.IsValid())
	assert.True(t, ScopeTeam.IsValid())
	assert.True(t, ScopeOrg.IsValid())
	assert.False(t, Scope("global").IsValid())
	assert.False(t, Scope("").IsValid())
}

func TestRolePermissions_CoversAllMembershipRoles(t *testing.T) {
	roles := []organization.MembershipRole{
		organization.MembershipRoleSuperAdmin,
		organization.MembershipRoleAdminRH,
		organization.MembershipRoleGestor,
		organization.MembershipRoleColaborador,
		organization.MembershipRoleVisualizador,
	}
	for _, r := range roles {
		perms, ok := RolePermissions[string(r)]
		assert.Truef(t, ok, "RolePermissions missing entry for %q", r)
		assert.NotEmptyf(t, perms, "RolePermissions for %q must not be empty", r)
	}
}

func TestRolePermissions_AllPermissionIDsAreUnique(t *testing.T) {
	for slug, perms := range RolePermissions {
		seen := make(map[string]struct{}, len(perms))
		for _, id := range perms {
			if _, dup := seen[id]; dup {
				t.Errorf("role %q has duplicate permission %q", slug, id)
			}
			seen[id] = struct{}{}
		}
	}
}

func TestRolePermissions_ReferenceExistingCatalogPermissionIDs(t *testing.T) {
	catalogIDs := make(map[string]struct{}, len(permission.Catalog()))
	for _, perm := range permission.Catalog() {
		catalogIDs[perm.ID] = struct{}{}
	}

	for slug, perms := range RolePermissions {
		for _, id := range perms {
			if _, ok := catalogIDs[id]; !ok {
				t.Errorf("role %q references unknown permission %q", slug, id)
			}
		}
	}
}
