package postgres

import (
	"context"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain/role"
	"github.com/getbud-co/bud2/backend/internal/infra/postgres/sqlc"
)

type roleQuerier interface {
	ListRoles(ctx context.Context, organizationID uuid.UUID) ([]sqlc.ListRolesRow, error)
}

type RoleRepository struct {
	q roleQuerier
}

func NewRoleRepository(q roleQuerier) *RoleRepository {
	return &RoleRepository{q: q}
}

func (r *RoleRepository) List(ctx context.Context, organizationID uuid.UUID) ([]role.Role, error) {
	rows, err := r.q.ListRoles(ctx, organizationID)
	if err != nil {
		return nil, err
	}

	roles := make([]role.Role, 0, len(rows))
	for _, row := range rows {
		roles = append(roles, roleRowToDomain(row))
	}
	return roles, nil
}

func roleRowToDomain(row sqlc.ListRolesRow) role.Role {
	return role.Role{
		ID:          row.ID,
		Slug:        row.Slug,
		Name:        row.Name,
		Description: pgtypeToText(row.Description),
		Type:        role.Type(row.Type),
		Scope:       role.Scope(row.Scope),
		IsDefault:   row.IsDefault,
		UsersCount:  int(row.UsersCount),
		CreatedAt:   row.CreatedAt,
		UpdatedAt:   row.UpdatedAt,
	}
}
