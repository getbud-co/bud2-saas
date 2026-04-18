package organization

import (
	"context"
	"log/slog"

	org "github.com/getbud-co/bud2/backend/internal/domain/organization"
)

type ListCommand struct {
	Status *string
	Page   int
	Size   int
}

type ListUseCase struct {
	repo   org.Repository
	logger *slog.Logger
}

func NewListUseCase(repo org.Repository, logger *slog.Logger) *ListUseCase {
	return &ListUseCase{repo: repo, logger: logger}
}

func (uc *ListUseCase) Execute(ctx context.Context, cmd ListCommand) (org.ListResult, error) {
	uc.logger.Debug("listing organizations", "page", cmd.Page, "size", cmd.Size)

	if cmd.Size <= 0 {
		cmd.Size = 20
	}
	if cmd.Size > 100 {
		cmd.Size = 100
	}
	if cmd.Page <= 0 {
		cmd.Page = 1
	}

	filter := org.ListFilter{
		Page: cmd.Page,
		Size: cmd.Size,
	}
	if cmd.Status != nil {
		s := org.Status(*cmd.Status)
		filter.Status = &s
	}

	result, err := uc.repo.List(ctx, filter)
	if err != nil {
		uc.logger.Error("failed to list organizations", "error", err)
		return org.ListResult{}, err
	}

	uc.logger.Debug("organizations listed", "count", len(result.Organizations), "total", result.Total)
	return result, nil
}
