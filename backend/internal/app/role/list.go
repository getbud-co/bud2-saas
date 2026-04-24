package role

import (
	"context"
	"log/slog"

	"github.com/getbud-co/bud2/backend/internal/domain"
	roledom "github.com/getbud-co/bud2/backend/internal/domain/role"
)

type ListUseCase struct {
	repo   roledom.Repository
	logger *slog.Logger
}

func NewListUseCase(repo roledom.Repository, logger *slog.Logger) *ListUseCase {
	return &ListUseCase{repo: repo, logger: logger}
}

type ListCommand struct {
	OrganizationID domain.TenantID
}

func (uc *ListUseCase) Execute(ctx context.Context, cmd ListCommand) ([]roledom.Role, error) {
	uc.logger.Debug("listing roles")

	roles, err := uc.repo.List(ctx, cmd.OrganizationID.UUID())
	if err != nil {
		uc.logger.Error("failed to list roles", "error", err)
		return nil, err
	}

	for i := range roles {
		if perms, ok := roledom.RolePermissions[roles[i].Slug]; ok {
			roles[i].PermissionIDs = append([]string(nil), perms...)
		} else {
			roles[i].PermissionIDs = []string{}
		}
	}

	uc.logger.Debug("roles listed", "count", len(roles))
	return roles, nil
}
