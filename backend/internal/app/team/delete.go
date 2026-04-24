package team

import (
	"context"
	"log/slog"

	"github.com/google/uuid"

	apptx "github.com/getbud-co/bud2/backend/internal/app/tx"
	"github.com/getbud-co/bud2/backend/internal/domain"
)

type DeleteCommand struct {
	OrganizationID domain.TenantID
	ID             uuid.UUID
}

type DeleteUseCase struct {
	txm    apptx.Manager
	logger *slog.Logger
}

func NewDeleteUseCase(txm apptx.Manager, logger *slog.Logger) *DeleteUseCase {
	return &DeleteUseCase{txm: txm, logger: logger}
}

func (uc *DeleteUseCase) Execute(ctx context.Context, cmd DeleteCommand) error {
	uc.logger.DebugContext(ctx, "delete team", "team_id", cmd.ID, "org_id", cmd.OrganizationID)

	err := uc.txm.WithTx(ctx, func(repos apptx.Repositories) error {
		if _, err := repos.Teams().GetByID(ctx, cmd.ID, cmd.OrganizationID.UUID()); err != nil {
			return err
		}
		return repos.Teams().SoftDelete(ctx, cmd.ID, cmd.OrganizationID.UUID())
	})
	if err != nil {
		uc.logger.WarnContext(ctx, "delete team failed", "team_id", cmd.ID, "error", err)
		return err
	}

	uc.logger.InfoContext(ctx, "team deleted", "team_id", cmd.ID)
	return nil
}
