package rbac

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestInitEnforcer(t *testing.T) {
	// Create temporary model and policy files
	tempDir := t.TempDir()

	modelContent := `[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = r.sub == p.sub && r.obj == p.obj && r.act == p.act`

	policyContent := `p, admin, org, read
p, admin, org, write
p, user, org, read`

	modelPath := filepath.Join(tempDir, "model.conf")
	policyPath := filepath.Join(tempDir, "policy.csv")

	err := os.WriteFile(modelPath, []byte(modelContent), 0644)
	require.NoError(t, err)

	err = os.WriteFile(policyPath, []byte(policyContent), 0644)
	require.NoError(t, err)

	// Test initialization
	err = InitEnforcer(modelPath, policyPath)
	require.NoError(t, err)

	// Verify enforcer is not nil
	assert.NotNil(t, Enforcer())
}

func TestInitEnforcer_InvalidModel(t *testing.T) {
	tempDir := t.TempDir()

	// Invalid model content
	modelContent := `invalid content`
	policyContent := `p, admin, org, read`

	modelPath := filepath.Join(tempDir, "model.conf")
	policyPath := filepath.Join(tempDir, "policy.csv")

	err := os.WriteFile(modelPath, []byte(modelContent), 0644)
	require.NoError(t, err)

	err = os.WriteFile(policyPath, []byte(policyContent), 0644)
	require.NoError(t, err)

	// Should return error for invalid model
	err = InitEnforcer(modelPath, policyPath)
	assert.Error(t, err)
}

func TestInitEnforcer_FileNotFound(t *testing.T) {
	// Should return error when files don't exist
	err := InitEnforcer("/nonexistent/model.conf", "/nonexistent/policy.csv")
	assert.Error(t, err)
}

func TestEnforcer_BeforeInit(t *testing.T) {
	// Reset global enforcer for this test
	e = nil

	// Should return nil before initialization
	assert.Nil(t, Enforcer())
}

// Guards against a regression where a membership role is added without also
// granting it settings.read — the /roles and /permissions endpoints require it
// so every logged-in user can resolve role labels in the UI.
func TestPolicy_EverySystemRoleCanReadSettings(t *testing.T) {
	repoRoot, err := filepath.Abs(filepath.Join("..", "..", "..", ".."))
	require.NoError(t, err)
	modelPath := filepath.Join(repoRoot, "backend", "policies", "model.conf")
	policyPath := filepath.Join(repoRoot, "backend", "policies", "policy.csv")

	require.NoError(t, InitEnforcer(modelPath, policyPath))
	t.Cleanup(func() { e = nil })

	for _, role := range []string{"super-admin", "admin-rh", "gestor", "colaborador", "visualizador"} {
		allowed, err := Enforcer().Enforce(role, "settings", "read")
		require.NoError(t, err)
		assert.Truef(t, allowed, "role %q must hold (settings, read)", role)
	}
}

// Locks the policy.csv missions matrix to the contract documented in
// internal/domain/role/role.go RolePermissions and mirrored on the frontend
// in lib/config-store.ts. Drift between these three sources caused a
// previous incident where colaborador could write missions despite the
// domain only granting them view.
func TestPolicy_MissionsMatrix_MatchesRolePermissions(t *testing.T) {
	repoRoot, err := filepath.Abs(filepath.Join("..", "..", "..", ".."))
	require.NoError(t, err)
	modelPath := filepath.Join(repoRoot, "backend", "policies", "model.conf")
	policyPath := filepath.Join(repoRoot, "backend", "policies", "policy.csv")

	require.NoError(t, InitEnforcer(modelPath, policyPath))
	t.Cleanup(func() { e = nil })

	type matrix struct {
		read, write, deletable bool
	}
	expected := map[string]matrix{
		"super-admin":  {true, true, true},
		"admin-rh":     {true, true, true},
		"gestor":       {true, true, false},
		"colaborador":  {true, false, false},
		"visualizador": {true, false, false},
	}

	for role, want := range expected {
		read, err := Enforcer().Enforce(role, "missions", "read")
		require.NoError(t, err)
		assert.Equalf(t, want.read, read, "role %q (missions, read)", role)

		write, err := Enforcer().Enforce(role, "missions", "write")
		require.NoError(t, err)
		assert.Equalf(t, want.write, write, "role %q (missions, write)", role)

		del, err := Enforcer().Enforce(role, "missions", "delete")
		require.NoError(t, err)
		assert.Equalf(t, want.deletable, del, "role %q (missions, delete)", role)
	}
}

// Indicators and tasks are sub-resources of missions. The matrix is one step
// more permissive on the gestor row: gestor can delete an indicator or a
// task even though they cannot delete a mission. The reasoning is that
// editing a mission via the page commonly involves removing one of its
// indicators or tasks (the EDIT FLOW dispatches a per-resource diff), so
// requiring an admin role to remove a single indicator would block routine
// edits. Removing the parent mission stays admin-only because the cascade
// is destructive.
func TestPolicy_IndicatorsAndTasksMatrix(t *testing.T) {
	repoRoot, err := filepath.Abs(filepath.Join("..", "..", "..", ".."))
	require.NoError(t, err)
	modelPath := filepath.Join(repoRoot, "backend", "policies", "model.conf")
	policyPath := filepath.Join(repoRoot, "backend", "policies", "policy.csv")

	require.NoError(t, InitEnforcer(modelPath, policyPath))
	t.Cleanup(func() { e = nil })

	type matrix struct {
		read, write, deletable bool
	}
	expected := map[string]matrix{
		"super-admin":  {true, true, true},
		"admin-rh":     {true, true, true},
		"gestor":       {true, true, true},
		"colaborador":  {true, false, false},
		"visualizador": {true, false, false},
	}

	for _, resource := range []string{"indicators", "tasks"} {
		for role, want := range expected {
			read, err := Enforcer().Enforce(role, resource, "read")
			require.NoError(t, err)
			assert.Equalf(t, want.read, read, "role %q (%s, read)", role, resource)

			write, err := Enforcer().Enforce(role, resource, "write")
			require.NoError(t, err)
			assert.Equalf(t, want.write, write, "role %q (%s, write)", role, resource)

			del, err := Enforcer().Enforce(role, resource, "delete")
			require.NoError(t, err)
			assert.Equalf(t, want.deletable, del, "role %q (%s, delete)", role, resource)
		}
	}
}
