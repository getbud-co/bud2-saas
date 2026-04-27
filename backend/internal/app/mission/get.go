package mission

import (
	"context"
	"log/slog"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domainmission "github.com/getbud-co/bud2/backend/internal/domain/mission"
)

type GetUseCase struct {
	missions domainmission.Repository
	logger   *slog.Logger
}

func NewGetUseCase(missions domainmission.Repository, logger *slog.Logger) *GetUseCase {
	return &GetUseCase{missions: missions, logger: logger}
}

func (uc *GetUseCase) Execute(ctx context.Context, organizationID domain.TenantID, id uuid.UUID) (*domainmission.Mission, error) {
	uc.logger.DebugContext(ctx, "get mission", "mission_id", id, "org_id", organizationID)
	return uc.missions.GetByID(ctx, id, organizationID.UUID())
}
