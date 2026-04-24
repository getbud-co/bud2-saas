package cycle

import (
	"context"
	"log/slog"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domaincycle "github.com/getbud-co/bud2/backend/internal/domain/cycle"
)

type GetUseCase struct {
	cycles domaincycle.Repository
	logger *slog.Logger
}

func NewGetUseCase(cycles domaincycle.Repository, logger *slog.Logger) *GetUseCase {
	return &GetUseCase{cycles: cycles, logger: logger}
}

func (uc *GetUseCase) Execute(ctx context.Context, organizationID domain.TenantID, id uuid.UUID) (*domaincycle.Cycle, error) {
	uc.logger.DebugContext(ctx, "get cycle", "cycle_id", id, "org_id", organizationID)
	return uc.cycles.GetByID(ctx, id, organizationID.UUID())
}
