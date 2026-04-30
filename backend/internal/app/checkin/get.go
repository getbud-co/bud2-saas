package checkin

import (
	"context"
	"log/slog"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domaincheckin "github.com/getbud-co/bud2/backend/internal/domain/checkin"
)

type GetUseCase struct {
	repo   domaincheckin.Repository
	logger *slog.Logger
}

func NewGetUseCase(repo domaincheckin.Repository, logger *slog.Logger) *GetUseCase {
	return &GetUseCase{repo: repo, logger: logger}
}

func (uc *GetUseCase) Execute(ctx context.Context, orgID domain.TenantID, id uuid.UUID) (*domaincheckin.CheckIn, error) {
	return uc.repo.GetByID(ctx, id, orgID.UUID())
}
