package tag

import (
	"context"
	"log/slog"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domaintag "github.com/getbud-co/bud2/backend/internal/domain/tag"
)

type GetUseCase struct {
	tags   domaintag.Repository
	logger *slog.Logger
}

func NewGetUseCase(tags domaintag.Repository, logger *slog.Logger) *GetUseCase {
	return &GetUseCase{tags: tags, logger: logger}
}

func (uc *GetUseCase) Execute(ctx context.Context, organizationID domain.TenantID, id uuid.UUID) (*domaintag.Tag, error) {
	uc.logger.DebugContext(ctx, "get tag", "tag_id", id, "org_id", organizationID)
	return uc.tags.GetByID(ctx, id, organizationID.UUID())
}
