package cycle

import (
	"context"
	"log/slog"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domaincycle "github.com/getbud-co/bud2/backend/internal/domain/cycle"
)

type DeleteCommand struct {
	OrganizationID domain.TenantID
	ID             uuid.UUID
}

type DeleteUseCase struct {
	cycles domaincycle.Repository
	logger *slog.Logger
}

func NewDeleteUseCase(cycles domaincycle.Repository, logger *slog.Logger) *DeleteUseCase {
	return &DeleteUseCase{cycles: cycles, logger: logger}
}

func (uc *DeleteUseCase) Execute(ctx context.Context, cmd DeleteCommand) error {
	uc.logger.DebugContext(ctx, "delete cycle", "cycle_id", cmd.ID, "org_id", cmd.OrganizationID)
	if _, err := uc.cycles.GetByID(ctx, cmd.ID, cmd.OrganizationID.UUID()); err != nil {
		return err
	}
	if err := uc.cycles.SoftDelete(ctx, cmd.ID, cmd.OrganizationID.UUID()); err != nil {
		uc.logger.WarnContext(ctx, "delete cycle failed", "cycle_id", cmd.ID, "error", err)
		return err
	}
	uc.logger.InfoContext(ctx, "cycle deleted", "cycle_id", cmd.ID)
	return nil
}
