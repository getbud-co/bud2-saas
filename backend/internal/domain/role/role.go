package role

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type Type string

const (
	TypeSystem Type = "system"
	TypeCustom Type = "custom"
)

func (t Type) IsValid() bool {
	return t == TypeSystem || t == TypeCustom
}

type Scope string

const (
	ScopeSelf Scope = "self"
	ScopeTeam Scope = "team"
	ScopeOrg  Scope = "org"
)

func (s Scope) IsValid() bool {
	return s == ScopeSelf || s == ScopeTeam || s == ScopeOrg
}

type Role struct {
	ID            uuid.UUID
	Slug          string
	Name          string
	Description   *string
	Type          Type
	Scope         Scope
	IsDefault     bool
	PermissionIDs []string
	UsersCount    int
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

type Repository interface {
	List(ctx context.Context, organizationID uuid.UUID) ([]Role, error)
}

// RolePermissions maps each role slug to the permission IDs it holds.
// Source of truth mirrored from frontend/src/lib/config-store.ts (buildOrgDefaults).
var RolePermissions = map[string][]string{
	"super-admin": {
		"people.view", "people.create", "people.edit", "people.deactivate",
		"missions.view", "missions.create", "missions.edit", "missions.delete", "missions.assign",
		"surveys.view", "surveys.create", "surveys.edit", "surveys.publish", "surveys.results",
		"settings.access", "settings.edit",
		"assistant.tone", "assistant.language", "assistant.suggestions", "assistant.transparency", "assistant.llm",
	},
	"admin-rh": {
		"people.view", "people.create", "people.edit", "people.deactivate",
		"missions.view", "missions.create", "missions.edit", "missions.delete", "missions.assign",
		"surveys.view", "surveys.create", "surveys.edit", "surveys.publish", "surveys.results",
		"settings.access",
		"assistant.tone", "assistant.language", "assistant.suggestions", "assistant.transparency", "assistant.llm",
	},
	"gestor": {
		"people.view",
		"missions.view", "missions.create", "missions.edit", "missions.assign",
		"surveys.view", "surveys.results",
		"assistant.tone", "assistant.language", "assistant.suggestions", "assistant.transparency",
	},
	"colaborador": {
		"people.view",
		"missions.view",
		"surveys.view",
		"assistant.tone", "assistant.language",
	},
	"visualizador": {
		"people.view",
		"missions.view",
		"surveys.view",
		"assistant.tone",
	},
}
