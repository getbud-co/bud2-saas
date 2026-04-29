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

	mentions := cmd.Mentions
	if mentions == nil {
		mentions = []string{}
	}

	c := &domaincheckin.CheckIn{
		ID:            uuid.New(),
		OrgID:         cmd.OrgID.UUID(),
		IndicatorID:   cmd.IndicatorID,
		AuthorID:      cmd.AuthorID,
		Value:         cmd.Value,
		PreviousValue: cmd.PreviousValue,
		Confidence:    domaincheckin.Confidence(cmd.Confidence),
		Note:          cmd.Note,
		Mentions:      mentions,
	}
	if err := c.Validate(); err != nil {
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
