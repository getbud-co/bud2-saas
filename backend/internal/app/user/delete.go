package user

import (
	"context"
	"errors"
	"log/slog"

	"github.com/google/uuid"

	apptx "github.com/getbud-co/bud2/backend/internal/app/tx"
	"github.com/getbud-co/bud2/backend/internal/domain"
)

var ErrCannotDeleteOwnMembership = errors.New("cannot delete your own membership")

type DeleteCommand struct {
	OrganizationID  domain.TenantID
	RequesterUserID uuid.UUID
	TargetUserID    uuid.UUID
}

type DeleteUseCase struct {
	txm    apptx.Manager
	logger *slog.Logger
}

func NewDeleteUseCase(txm apptx.Manager, logger *slog.Logger) *DeleteUseCase {
	return &DeleteUseCase{txm: txm, logger: logger}
}

func (uc *DeleteUseCase) Execute(ctx context.Context, cmd DeleteCommand) error {
	if cmd.RequesterUserID == cmd.TargetUserID {
		return ErrCannotDeleteOwnMembership
	}

	uc.logger.Debug("deleting user membership", "organization_id", cmd.OrganizationID, "user_id", cmd.TargetUserID)

	return uc.txm.WithTx(ctx, func(repos apptx.Repositories) error {
		_, err := repos.Users().GetByIDForOrganization(ctx, cmd.TargetUserID, cmd.OrganizationID.UUID())
		if err != nil {
			return err
		}
		return repos.Users().DeleteMembership(ctx, cmd.OrganizationID.UUID(), cmd.TargetUserID)
	})
}
