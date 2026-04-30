package tag

import (
	"context"
	"log/slog"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domaintag "github.com/getbud-co/bud2/backend/internal/domain/tag"
)

type ListCommand struct {
	OrganizationID domain.TenantID
	Page           int
	Size           int
}

type ListUseCase struct {
	tags   domaintag.Repository
	logger *slog.Logger
}

func NewListUseCase(tags domaintag.Repository, logger *slog.Logger) *ListUseCase {
	return &ListUseCase{tags: tags, logger: logger}
}

func (uc *ListUseCase) Execute(ctx context.Context, cmd ListCommand) (domaintag.ListResult, error) {
	if cmd.Page <= 0 {
		cmd.Page = 1
	}
	if cmd.Size <= 0 {
		cmd.Size = 20
	}
	if cmd.Size > 100 {
		cmd.Size = 100
	}
	return uc.tags.List(ctx, cmd.OrganizationID.UUID(), cmd.Page, cmd.Size)
}
