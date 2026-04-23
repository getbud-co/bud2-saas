package team

import (
	"context"
	"log/slog"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domainteam "github.com/getbud-co/bud2/backend/internal/domain/team"
)

type GetUseCase struct {
	teams  domainteam.Repository
	logger *slog.Logger
}

func NewGetUseCase(teams domainteam.Repository, logger *slog.Logger) *GetUseCase {
	return &GetUseCase{teams: teams, logger: logger}
}

func (uc *GetUseCase) Execute(ctx context.Context, organizationID domain.TenantID, id uuid.UUID) (*domainteam.Team, error) {
	uc.logger.DebugContext(ctx, "get team", "team_id", id, "org_id", organizationID)
	return uc.teams.GetByID(ctx, id, organizationID.UUID())
}
