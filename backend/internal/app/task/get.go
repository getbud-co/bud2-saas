package task

import (
	"context"
	"log/slog"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domaintask "github.com/getbud-co/bud2/backend/internal/domain/task"
)

type GetUseCase struct {
	tasks  domaintask.Repository
	logger *slog.Logger
}

func NewGetUseCase(tasks domaintask.Repository, logger *slog.Logger) *GetUseCase {
	return &GetUseCase{tasks: tasks, logger: logger}
}

func (uc *GetUseCase) Execute(ctx context.Context, organizationID domain.TenantID, id uuid.UUID) (*domaintask.Task, error) {
	uc.logger.DebugContext(ctx, "get task", "task_id", id, "org_id", organizationID)
	return uc.tasks.GetByID(ctx, id, organizationID.UUID())
}
