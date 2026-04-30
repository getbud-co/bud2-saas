package indicator

import (
	"context"
	"log/slog"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domainindicator "github.com/getbud-co/bud2/backend/internal/domain/indicator"
)

type GetUseCase struct {
	indicators domainindicator.Repository
	logger     *slog.Logger
}

func NewGetUseCase(indicators domainindicator.Repository, logger *slog.Logger) *GetUseCase {
	return &GetUseCase{indicators: indicators, logger: logger}
}

func (uc *GetUseCase) Execute(ctx context.Context, organizationID domain.TenantID, id uuid.UUID) (*domainindicator.Indicator, error) {
	uc.logger.DebugContext(ctx, "get indicator", "indicator_id", id, "org_id", organizationID)
	return uc.indicators.GetByID(ctx, id, organizationID.UUID())
}
