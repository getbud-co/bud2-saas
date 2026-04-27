package mission

import (
	"context"
	"errors"
	"log/slog"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domainmission "github.com/getbud-co/bud2/backend/internal/domain/mission"
)

type DeleteCommand struct {
	OrganizationID domain.TenantID
	ID             uuid.UUID
}

type DeleteUseCase struct {
	missions domainmission.Repository
	logger   *slog.Logger
}

func NewDeleteUseCase(missions domainmission.Repository, logger *slog.Logger) *DeleteUseCase {
	return &DeleteUseCase{missions: missions, logger: logger}
}

// Execute is idempotent: returns nil if already deleted (no-op), error only on real failures.
func (uc *DeleteUseCase) Execute(ctx context.Context, cmd DeleteCommand) error {
	uc.logger.DebugContext(ctx, "delete mission", "mission_id", cmd.ID, "org_id", cmd.OrganizationID)
	orgID := cmd.OrganizationID.UUID()

	if _, err := uc.missions.GetByID(ctx, cmd.ID, orgID); err != nil {
		if errors.Is(err, domainmission.ErrNotFound) {
			return nil // idempotent
		}
		return err
	}
	if err := uc.missions.SoftDeleteSubtree(ctx, cmd.ID, orgID); err != nil {
		uc.logger.WarnContext(ctx, "delete mission failed", "mission_id", cmd.ID, "error", err)
		return err
	}
	uc.logger.InfoContext(ctx, "mission deleted", "mission_id", cmd.ID)
	return nil
}
