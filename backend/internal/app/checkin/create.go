package checkin

import (
	"context"
	"log/slog"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domaincheckin "github.com/getbud-co/bud2/backend/internal/domain/checkin"
)

type CreateCommand struct {
	OrgID         domain.TenantID
	IndicatorID   uuid.UUID
	AuthorID      uuid.UUID
	Value         string
	PreviousValue *string
	Confidence    string
	Note          *string
	Mentions      []string
}

type CreateUseCase struct {
	repo   domaincheckin.Repository
	logger *slog.Logger
}

func NewCreateUseCase(repo domaincheckin.Repository, logger *slog.Logger) *CreateUseCase {
	return &CreateUseCase{repo: repo, logger: logger}
}

func (uc *CreateUseCase) Execute(ctx context.Context, cmd CreateCommand) (*domaincheckin.CheckIn, error) {
	uc.logger.DebugContext(ctx, "create check-in", "org_id", cmd.OrgID, "indicator_id", cmd.IndicatorID)

	opts := []domaincheckin.CheckInOption{
		domaincheckin.WithPreviousValue(cmd.PreviousValue),
		domaincheckin.WithNote(cmd.Note),
		domaincheckin.WithMentions(cmd.Mentions),
	}

	c, err := domaincheckin.NewCheckIn(
		cmd.OrgID.UUID(),
		cmd.IndicatorID,
		cmd.AuthorID,
		cmd.Value,
		domaincheckin.Confidence(cmd.Confidence),
		opts...,
	)
	if err != nil {
		return nil, err
	}

	created, err := uc.repo.Create(ctx, c)
	if err != nil {
		uc.logger.WarnContext(ctx, "create check-in failed", "error", err)
		return nil, err
	}
	uc.logger.InfoContext(ctx, "check-in created", "check_in_id", created.ID)
	return created, nil
}
