package organization

import (
	"context"
	"log/slog"

	"github.com/google/uuid"

	org "github.com/getbud-co/bud2/backend/internal/domain/organization"
)

type GetCommand struct {
	RequesterUserID        uuid.UUID
	RequesterIsSystemAdmin bool
	ID                     uuid.UUID
}

type GetUseCase struct {
	repo   org.Repository
	logger *slog.Logger
}

func NewGetUseCase(repo org.Repository, logger *slog.Logger) *GetUseCase {
	return &GetUseCase{repo: repo, logger: logger}
}

func (uc *GetUseCase) Execute(ctx context.Context, cmd GetCommand) (*org.Organization, error) {
	uc.logger.Debug("fetching organization", "organization_id", cmd.ID)
	var (
		result *org.Organization
		err    error
	)
	if cmd.RequesterIsSystemAdmin {
		result, err = uc.repo.GetByID(ctx, cmd.ID)
	} else {
		result, err = uc.repo.GetByIDForUser(ctx, cmd.RequesterUserID, cmd.ID)
	}
	if err != nil {
		uc.logger.Error("failed to fetch organization", "error", err, "organization_id", cmd.ID)
		return nil, err
	}
	return result, nil
}
