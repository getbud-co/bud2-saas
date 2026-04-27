package task

import (
	"context"
	"log/slog"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domaintask "github.com/getbud-co/bud2/backend/internal/domain/task"
)

type ListCommand struct {
	OrganizationID domain.TenantID
	MissionID      *uuid.UUID
	IndicatorID    *uuid.UUID
	AssigneeID     *uuid.UUID
	Status         *string
	Page           int
	Size           int
}

type ListUseCase struct {
	tasks  domaintask.Repository
	logger *slog.Logger
}

func NewListUseCase(tasks domaintask.Repository, logger *slog.Logger) *ListUseCase {
	return &ListUseCase{tasks: tasks, logger: logger}
}

func (uc *ListUseCase) Execute(ctx context.Context, cmd ListCommand) (domaintask.ListResult, error) {
	if cmd.Page <= 0 {
		cmd.Page = 1
	}
	if cmd.Size <= 0 {
		cmd.Size = 20
	}
	if cmd.Size > 100 {
		cmd.Size = 100
	}

	var status *domaintask.Status
	if cmd.Status != nil {
		s := domaintask.Status(*cmd.Status)
		status = &s
	}

	res, err := uc.tasks.List(ctx, domaintask.ListFilter{
		OrganizationID: cmd.OrganizationID.UUID(),
		MissionID:      cmd.MissionID,
		IndicatorID:    cmd.IndicatorID,
		AssigneeID:     cmd.AssigneeID,
		Status:         status,
		Page:           cmd.Page,
		Size:           cmd.Size,
	})
	if err != nil {
		return domaintask.ListResult{}, err
	}
	res.Page = cmd.Page
	res.Size = cmd.Size
	return res, nil
}
