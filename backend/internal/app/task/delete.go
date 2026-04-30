package task

import (
	"context"
	"errors"
	"log/slog"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domaintask "github.com/getbud-co/bud2/backend/internal/domain/task"
)

type DeleteCommand struct {
	OrganizationID domain.TenantID
	ID             uuid.UUID
}

type DeleteUseCase struct {
	tasks  domaintask.Repository
	logger *slog.Logger
}

func NewDeleteUseCase(tasks domaintask.Repository, logger *slog.Logger) *DeleteUseCase {
	return &DeleteUseCase{tasks: tasks, logger: logger}
}

func (uc *DeleteUseCase) Execute(ctx context.Context, cmd DeleteCommand) error {
	uc.logger.DebugContext(ctx, "delete task", "task_id", cmd.ID, "org_id", cmd.OrganizationID)
	orgID := cmd.OrganizationID.UUID()

	if _, err := uc.tasks.GetByID(ctx, cmd.ID, orgID); err != nil {
		if errors.Is(err, domaintask.ErrNotFound) {
			return nil // idempotent
		}
		return err
	}
	if err := uc.tasks.SoftDelete(ctx, cmd.ID, orgID); err != nil {
		uc.logger.WarnContext(ctx, "delete task failed", "task_id", cmd.ID, "error", err)
		return err
	}
	uc.logger.InfoContext(ctx, "task deleted", "task_id", cmd.ID)
	return nil
}
