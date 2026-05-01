package checkin

import (
	"context"
	"log/slog"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domaincheckin "github.com/getbud-co/bud2/backend/internal/domain/checkin"
)

type UpdateCommand struct {
	OrgID      domain.TenantID
	ID         uuid.UUID
	Value      string
	Confidence string
	Note       *string
	Mentions   []string
}

type UpdateUseCase struct {
	repo   domaincheckin.Repository
	logger *slog.Logger
}

func NewUpdateUseCase(repo domaincheckin.Repository, logger *slog.Logger) *UpdateUseCase {
	return &UpdateUseCase{repo: repo, logger: logger}
}

func (uc *UpdateUseCase) Execute(ctx context.Context, cmd UpdateCommand) (*domaincheckin.CheckIn, error) {
	existing, err := uc.repo.GetByID(ctx, cmd.ID, cmd.OrgID.UUID())
	if err != nil {
		return nil, err
	}

	existing.Value = cmd.Value
	existing.Confidence = domaincheckin.Confidence(cmd.Confidence)
	existing.Note = cmd.Note
	if cmd.Mentions == nil {
		existing.Mentions = []string{}
	} else {
		existing.Mentions = cmd.Mentions
	}

	if err := existing.Validate(); err != nil {
		return nil, err
	}

	result, err := uc.repo.Update(ctx, existing)
	if err != nil {
		uc.logger.WarnContext(ctx, "update check-in failed", "error", err)
		return nil, err
	}
	return result, nil
}
