package checkin

import (
	"context"
	"log/slog"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domaincheckin "github.com/getbud-co/bud2/backend/internal/domain/checkin"
)

type ListCommand struct {
	OrgID       domain.TenantID
	IndicatorID uuid.UUID
	Page        int
	Size        int
}

type ListUseCase struct {
	repo   domaincheckin.Repository
	logger *slog.Logger
}

func NewListUseCase(repo domaincheckin.Repository, logger *slog.Logger) *ListUseCase {
	return &ListUseCase{repo: repo, logger: logger}
}

func (uc *ListUseCase) Execute(ctx context.Context, cmd ListCommand) (domaincheckin.ListResult, error) {
	if cmd.Page <= 0 {
		cmd.Page = 1
	}
	if cmd.Size <= 0 {
		cmd.Size = 50
	}
	if cmd.Size > 100 {
		cmd.Size = 100
	}
	return uc.repo.ListByIndicator(ctx, cmd.OrgID.UUID(), cmd.IndicatorID, cmd.Page, cmd.Size)
}
