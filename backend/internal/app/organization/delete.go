package organization

import (
	"context"
	"errors"
	"log/slog"

	"github.com/google/uuid"

	apptx "github.com/getbud-co/bud2/backend/internal/app/tx"
)

var ErrDeleteRequiresSystemAdmin = errors.New("only system admins can delete organizations")

type DeleteCommand struct {
	RequesterIsSystemAdmin bool
	ID                     uuid.UUID
}

type DeleteUseCase struct {
	txm    apptx.Manager
	logger *slog.Logger
}

func NewDeleteUseCase(txm apptx.Manager, logger *slog.Logger) *DeleteUseCase {
	return &DeleteUseCase{txm: txm, logger: logger}
}

func (uc *DeleteUseCase) Execute(ctx context.Context, cmd DeleteCommand) error {
	if !cmd.RequesterIsSystemAdmin {
		return ErrDeleteRequiresSystemAdmin
	}

	uc.logger.Debug("deleting organization", "organization_id", cmd.ID)

	return uc.txm.WithTx(ctx, func(repos apptx.Repositories) error {
		if _, err := repos.Organizations().GetByID(ctx, cmd.ID); err != nil {
			return err
		}
		return repos.Organizations().Delete(ctx, cmd.ID)
	})
}
