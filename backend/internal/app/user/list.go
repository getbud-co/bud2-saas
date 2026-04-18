package user

import (
	"context"
	"log/slog"

	"github.com/getbud-co/bud2/backend/internal/domain"
	usr "github.com/getbud-co/bud2/backend/internal/domain/user"
)

type ListCommand struct {
	OrganizationID domain.TenantID
	Status         *string
	Page           int
	Size           int
}

type ListUseCase struct {
	users  usr.Repository
	logger *slog.Logger
}

func NewListUseCase(users usr.Repository, logger *slog.Logger) *ListUseCase {
	return &ListUseCase{users: users, logger: logger}
}

func (uc *ListUseCase) Execute(ctx context.Context, cmd ListCommand) (usr.ListResult, error) {
	if cmd.Size <= 0 {
		cmd.Size = 20
	}
	if cmd.Size > 100 {
		cmd.Size = 100
	}
	if cmd.Page <= 0 {
		cmd.Page = 1
	}

	var userStatus *usr.Status
	if cmd.Status != nil {
		status := usr.Status(*cmd.Status)
		userStatus = &status
	}

	return uc.users.ListByOrganization(ctx, cmd.OrganizationID.UUID(), userStatus, cmd.Page, cmd.Size)
}
