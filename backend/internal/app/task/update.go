package task

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domainindicator "github.com/getbud-co/bud2/backend/internal/domain/indicator"
	domaintask "github.com/getbud-co/bud2/backend/internal/domain/task"
	domainuser "github.com/getbud-co/bud2/backend/internal/domain/user"
)

// UpdateCommand carries the partial-update intent: every optional field is a
// pointer, only non-nil fields are applied. mission_id is intentionally absent
// — moving a task between missions is not exposed via this endpoint.
type UpdateCommand struct {
	OrganizationID domain.TenantID
	ID             uuid.UUID
	Title          *string
	Description    *string
	IndicatorID    *uuid.UUID
	AssigneeID     *uuid.UUID
	Status         *string
	DueDate        *time.Time
}

type UpdateUseCase struct {
	tasks      domaintask.Repository
	indicators domainindicator.Repository
	users      domainuser.Repository
	logger     *slog.Logger
}

func NewUpdateUseCase(
	tasks domaintask.Repository,
	indicators domainindicator.Repository,
	users domainuser.Repository,
	logger *slog.Logger,
) *UpdateUseCase {
	return &UpdateUseCase{tasks: tasks, indicators: indicators, users: users, logger: logger}
}

func (uc *UpdateUseCase) Execute(ctx context.Context, cmd UpdateCommand) (*domaintask.Task, error) {
	uc.logger.DebugContext(ctx, "update task", "task_id", cmd.ID, "org_id", cmd.OrganizationID)
	orgID := cmd.OrganizationID.UUID()

	existing, err := uc.tasks.GetByID(ctx, cmd.ID, orgID)
	if err != nil {
		return nil, err
	}

	if cmd.AssigneeID != nil && *cmd.AssigneeID != existing.AssigneeID {
		if _, err := uc.users.GetActiveMemberByID(ctx, *cmd.AssigneeID, orgID); err != nil {
			if errors.Is(err, domainuser.ErrNotFound) {
				return nil, domaintask.ErrInvalidReference
			}
			return nil, err
		}
	}
	// Reparenting between indicators on the same mission requires
	// re-validating the new indicator. The single-pointer convention
	// means a nil cmd.IndicatorID is "no change" — clearing the parent
	// is not exposed through this endpoint (would require **T).
	if cmd.IndicatorID != nil {
		ind, err := uc.indicators.GetByID(ctx, *cmd.IndicatorID, orgID)
		if err != nil {
			if errors.Is(err, domainindicator.ErrNotFound) {
				return nil, domaintask.ErrInvalidReference
			}
			return nil, err
		}
		if ind.MissionID != existing.MissionID {
			return nil, domaintask.ErrInvalidReference
		}
	}

	if cmd.Title != nil {
		existing.Title = *cmd.Title
	}
	if cmd.Description != nil {
		existing.Description = cmd.Description
	}
	if cmd.AssigneeID != nil {
		existing.AssigneeID = *cmd.AssigneeID
	}
	if cmd.IndicatorID != nil {
		existing.IndicatorID = cmd.IndicatorID
	}
	if cmd.Status != nil {
		existing.Status = domaintask.Status(*cmd.Status)
	}
	if cmd.DueDate != nil {
		existing.DueDate = cmd.DueDate
	}

	// completed_at lifecycle: auto-fill on transition to done, clear on
	// transition out. Mirrors the mission completed_at behavior.
	if existing.Status == domaintask.StatusDone && existing.CompletedAt == nil {
		now := time.Now().UTC()
		existing.CompletedAt = &now
	}
	if existing.Status != domaintask.StatusDone && existing.CompletedAt != nil {
		existing.CompletedAt = nil
	}

	if err := existing.Validate(); err != nil {
		return nil, err
	}

	updated, err := uc.tasks.Update(ctx, existing)
	if err != nil {
		uc.logger.WarnContext(ctx, "update task failed", "task_id", cmd.ID, "error", err)
		return nil, err
	}
	uc.logger.InfoContext(ctx, "task updated", "task_id", updated.ID)
	return updated, nil
}
