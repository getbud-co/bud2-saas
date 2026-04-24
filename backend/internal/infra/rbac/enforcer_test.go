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
