package cycle

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domaincycle "github.com/getbud-co/bud2/backend/internal/domain/cycle"
)

type UpdateCommand struct {
	OrganizationID        domain.TenantID
	ID                    uuid.UUID
	Name                  string
	Type                  string
	StartDate             time.Time
	EndDate               time.Time
	Status                string
	OKRDefinitionDeadline *time.Time
	MidReviewDate         *time.Time
}

type UpdateUseCase struct {
	cycles domaincycle.Repository
	logger *slog.Logger
}

func NewUpdateUseCase(cycles domaincycle.Repository, logger *slog.Logger) *UpdateUseCase {
	return &UpdateUseCase{cycles: cycles, logger: logger}
}

func (uc *UpdateUseCase) Execute(ctx context.Context, cmd UpdateCommand) (*domaincycle.Cycle, error) {
	uc.logger.DebugContext(ctx, "update cycle", "cycle_id", cmd.ID, "org_id", cmd.OrganizationID)

	existing, err := uc.cycles.GetByID(ctx, cmd.ID, cmd.OrganizationID.UUID())
	if err != nil {
		return nil, err
	}
	if existing.Name != cmd.Name {
		if _, nameErr := uc.cycles.GetByName(ctx, cmd.OrganizationID.UUID(), cmd.Name); nameErr == nil {
			return nil, domaincycle.ErrNameExists
		} else if !errors.Is(nameErr, domaincycle.ErrNotFound) {
			return nil, nameErr
		}
	}

	existing.Name = cmd.Name
	existing.Type = domaincycle.Type(cmd.Type)
	existing.StartDate = cmd.StartDate
	existing.EndDate = cmd.EndDate
	existing.Status = domaincycle.Status(cmd.Status)
	existing.OKRDefinitionDeadline = cmd.OKRDefinitionDeadline
	existing.MidReviewDate = cmd.MidReviewDate
	if err := existing.Validate(); err != nil {
		return nil, err
	}

	updated, err := uc.cycles.Update(ctx, existing)
	if err != nil {
		uc.logger.WarnContext(ctx, "update cycle failed", "cycle_id", cmd.ID, "error", err)
		return nil, err
	}
	uc.logger.InfoContext(ctx, "cycle updated", "cycle_id", updated.ID)
	return updated, nil
}
