package indicator

import (
	"context"
	"errors"
	"log/slog"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domainindicator "github.com/getbud-co/bud2/backend/internal/domain/indicator"
)

type DeleteCommand struct {
	OrganizationID domain.TenantID
	ID             uuid.UUID
}

type DeleteUseCase struct {
	indicators domainindicator.Repository
	logger     *slog.Logger
}

func NewDeleteUseCase(indicators domainindicator.Repository, logger *slog.Logger) *DeleteUseCase {
	return &DeleteUseCase{indicators: indicators, logger: logger}
}

// Execute is idempotent: returns nil if already deleted (no-op), error only on
// real failures. Mirrors the missions delete contract.
func (uc *DeleteUseCase) Execute(ctx context.Context, cmd DeleteCommand) error {
	uc.logger.DebugContext(ctx, "delete indicator", "indicator_id", cmd.ID, "org_id", cmd.OrganizationID)
	orgID := cmd.OrganizationID.UUID()

	if _, err := uc.indicators.GetByID(ctx, cmd.ID, orgID); err != nil {
		if errors.Is(err, domainindicator.ErrNotFound) {
			return nil // idempotent
		}
		return err
	}
	if err := uc.indicators.SoftDelete(ctx, cmd.ID, orgID); err != nil {
		uc.logger.WarnContext(ctx, "delete indicator failed", "indicator_id", cmd.ID, "error", err)
		return err
	}
	uc.logger.InfoContext(ctx, "indicator deleted", "indicator_id", cmd.ID)
	return nil
}
