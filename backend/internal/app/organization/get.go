package organization

import (
	"context"
	"log/slog"

	"github.com/google/uuid"

	org "github.com/getbud-co/bud2/backend/internal/domain/organization"
)

type GetUseCase struct {
	repo   org.Repository
	logger *slog.Logger
}

func NewGetUseCase(repo org.Repository, logger *slog.Logger) *GetUseCase {
	return &GetUseCase{repo: repo, logger: logger}
}

func (uc *GetUseCase) Execute(ctx context.Context, id uuid.UUID) (*org.Organization, error) {
	uc.logger.Debug("fetching organization", "organization_id", id)
	result, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		uc.logger.Error("failed to fetch organization", "error", err, "organization_id", id)
		return nil, err
	}
	return result, nil
}
