package cycle

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domaincycle "github.com/getbud-co/bud2/backend/internal/domain/cycle"
)

type CreateCommand struct {
	OrganizationID        domain.TenantID
	Name                  string
	Type                  string
	StartDate             time.Time
	EndDate               time.Time
	Status                string
	OKRDefinitionDeadline *time.Time
	MidReviewDate         *time.Time
}

type CreateUseCase struct {
	cycles domaincycle.Repository
	logger *slog.Logger
}

func NewCreateUseCase(cycles domaincycle.Repository, logger *slog.Logger) *CreateUseCase {
	return &CreateUseCase{cycles: cycles, logger: logger}
}

func (uc *CreateUseCase) Execute(ctx context.Context, cmd CreateCommand) (*domaincycle.Cycle, error) {
	uc.logger.DebugContext(ctx, "create cycle", "org_id", cmd.OrganizationID, "name", cmd.Name)

	if _, err := uc.cycles.GetByName(ctx, cmd.OrganizationID.UUID(), cmd.Name); err == nil {
		return nil, domaincycle.ErrNameExists
	} else if !errors.Is(err, domaincycle.ErrNotFound) {
		return nil, err
	}

	opts := []domaincycle.CycleOption{
		domaincycle.WithOKRDefinitionDeadline(cmd.OKRDefinitionDeadline),
		domaincycle.WithMidReviewDate(cmd.MidReviewDate),
	}
	c, err := domaincycle.NewCycle(
		cmd.OrganizationID.UUID(),
		cmd.Name,
		domaincycle.Type(cmd.Type),
		cmd.StartDate,
		cmd.EndDate,
		domaincycle.Status(cmd.Status),
		opts...,
	)
	if err != nil {
		return nil, err
	}

	created, err := uc.cycles.Create(ctx, c)
	if err != nil {
		uc.logger.WarnContext(ctx, "create cycle failed", "error", err)
		return nil, err
	}
	uc.logger.InfoContext(ctx, "cycle created", "cycle_id", created.ID)
	return created, nil
}
