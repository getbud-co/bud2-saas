package checkin

import (
	"context"
	"errors"
	"log/slog"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domaincheckin "github.com/getbud-co/bud2/backend/internal/domain/checkin"
)

type DeleteCommand struct {
	OrgID domain.TenantID
	ID    uuid.UUID
}

type DeleteUseCase struct {
	repo   domaincheckin.Repository
	logger *slog.Logger
}

func NewDeleteUseCase(repo domaincheckin.Repository, logger *slog.Logger) *DeleteUseCase {
	return &DeleteUseCase{repo: repo, logger: logger}
}

// Execute soft-deletes the check-in. Idempotent: returns nil even if the
// check-in is already gone (CLAUDE.md: DELETE must return 204 even on repeat).
func (uc *DeleteUseCase) Execute(ctx context.Context, cmd DeleteCommand) error {
	err := uc.repo.SoftDelete(ctx, cmd.ID, cmd.OrgID.UUID())
	if err != nil && !errors.Is(err, domaincheckin.ErrNotFound) {
		uc.logger.WarnContext(ctx, "delete check-in failed", "error", err)
		return err
	}
	return nil
}
