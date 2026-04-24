package permission

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestGroup_IsValid(t *testing.T) {
	for _, g := range []Group{GroupPeople, GroupMissions, GroupSurveys, GroupSettings, GroupAssistant} {
		assert.Truef(t, g.IsValid(), "group %q should be valid", g)
	}
	assert.False(t, Group("other").IsValid())
	assert.False(t, Group("").IsValid())
}

func TestCatalog_HasExpectedSize(t *testing.T) {
	assert.Len(t, Catalog(), 21)
}

func TestCatalog_IDsAreUnique(t *testing.T) {
	ids := make(map[string]struct{})
	for _, p := range Catalog() {
		if _, dup := ids[p.ID]; dup {
			t.Errorf("duplicate permission id %q", p.ID)
		}
		ids[p.ID] = struct{}{}
	}
}

func TestCatalog_EveryPermissionHasValidGroup(t *testing.T) {
	for _, p := range Catalog() {
		assert.Truef(t, p.Group.IsValid(), "permission %q has invalid group %q", p.ID, p.Group)
		assert.NotEmptyf(t, p.Label, "permission %q has empty label", p.ID)
		assert.NotEmptyf(t, p.Description, "permission %q has empty description", p.ID)
	}
}

func TestCatalog_ReturnsCopy(t *testing.T) {
	first := Catalog()
	first[0].Label = "mutated"

	second := Catalog()
	assert.NotEqual(t, "mutated", second[0].Label, "Catalog() must return an isolated copy")
}
