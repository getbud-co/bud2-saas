package tag

import (
	"context"
	"log/slog"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domaintag "github.com/getbud-co/bud2/backend/internal/domain/tag"
)

type DeleteCommand struct {
	OrganizationID domain.TenantID
	ID             uuid.UUID
}

type DeleteUseCase struct {
	tags   domaintag.Repository
	logger *slog.Logger
}

func NewDeleteUseCase(tags domaintag.Repository, logger *slog.Logger) *DeleteUseCase {
	return &DeleteUseCase{tags: tags, logger: logger}
}

func (uc *DeleteUseCase) Execute(ctx context.Context, cmd DeleteCommand) error {
	uc.logger.DebugContext(ctx, "delete tag", "tag_id", cmd.ID, "org_id", cmd.OrganizationID)
	if _, err := uc.tags.GetByID(ctx, cmd.ID, cmd.OrganizationID.UUID()); err != nil {
		return err
	}
	if err := uc.tags.SoftDelete(ctx, cmd.ID, cmd.OrganizationID.UUID()); err != nil {
		uc.logger.WarnContext(ctx, "delete tag failed", "tag_id", cmd.ID, "error", err)
		return err
	}
	uc.logger.InfoContext(ctx, "tag deleted", "tag_id", cmd.ID)
	return nil
}
