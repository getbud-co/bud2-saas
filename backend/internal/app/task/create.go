package task

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domainindicator "github.com/getbud-co/bud2/backend/internal/domain/indicator"
	domainmission "github.com/getbud-co/bud2/backend/internal/domain/mission"
	domaintask "github.com/getbud-co/bud2/backend/internal/domain/task"
	domainuser "github.com/getbud-co/bud2/backend/internal/domain/user"
)

type CreateCommand struct {
	OrganizationID domain.TenantID
	MissionID      uuid.UUID
	IndicatorID    *uuid.UUID
	AssigneeID     uuid.UUID
	Title          string
	Description    *string
	Status         string
	SortOrder      int
	DueDate        *time.Time
}

type CreateUseCase struct {
	tasks      domaintask.Repository
	missions   domainmission.Repository
	indicators domainindicator.Repository
	users      domainuser.Repository
	logger     *slog.Logger
}

func NewCreateUseCase(
	tasks domaintask.Repository,
	missions domainmission.Repository,
	indicators domainindicator.Repository,
	users domainuser.Repository,
	logger *slog.Logger,
) *CreateUseCase {
	return &CreateUseCase{tasks: tasks, missions: missions, indicators: indicators, users: users, logger: logger}
}

func (uc *CreateUseCase) Execute(ctx context.Context, cmd CreateCommand) (*domaintask.Task, error) {
	uc.logger.DebugContext(ctx, "create task", "org_id", cmd.OrganizationID, "mission_id", cmd.MissionID, "title", cmd.Title)
	orgID := cmd.OrganizationID.UUID()

	if _, err := uc.missions.GetByID(ctx, cmd.MissionID, orgID); err != nil {
		if errors.Is(err, domainmission.ErrNotFound) {
			return nil, domaintask.ErrInvalidReference
		}
		return nil, err
	}
	if cmd.IndicatorID != nil {
		// The indicator must exist in the same org AND belong to the same
		// mission — otherwise the task would visually nest under an
		// indicator that the page never associates with its mission_id.
		ind, err := uc.indicators.GetByID(ctx, *cmd.IndicatorID, orgID)
		if err != nil {
			if errors.Is(err, domainindicator.ErrNotFound) {
				return nil, domaintask.ErrInvalidReference
			}
			return nil, err
		}
		if ind.MissionID != cmd.MissionID {
			return nil, domaintask.ErrInvalidReference
		}
	}
	if _, err := uc.users.GetActiveMemberByID(ctx, cmd.AssigneeID, orgID); err != nil {
		if errors.Is(err, domainuser.ErrNotFound) {
			return nil, domaintask.ErrInvalidReference
		}
		return nil, err
	}

	status := domaintask.Status(cmd.Status)
	if status == "" {
		status = domaintask.StatusTodo
	}

	t := &domaintask.Task{
		ID:             uuid.New(),
		OrganizationID: orgID,
		MissionID:      cmd.MissionID,
		IndicatorID:    cmd.IndicatorID,
		AssigneeID:     cmd.AssigneeID,
		Title:          cmd.Title,
		Description:    cmd.Description,
		Status:         status,
		SortOrder:      cmd.SortOrder,
		DueDate:        cmd.DueDate,
	}
	if err := t.Validate(); err != nil {
		return nil, err
	}

	created, err := uc.tasks.Create(ctx, t)
	if err != nil {
		uc.logger.WarnContext(ctx, "create task failed", "error", err)
		return nil, err
	}
	uc.logger.InfoContext(ctx, "task created", "task_id", created.ID)
	return created, nil
}
