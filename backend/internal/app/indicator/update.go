package indicator

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domainindicator "github.com/getbud-co/bud2/backend/internal/domain/indicator"
	domainuser "github.com/getbud-co/bud2/backend/internal/domain/user"
)

// UpdateCommand carries the partial-update intent: every optional field is a
// pointer, only non-nil fields are applied. Same Merge-Patch semantics as the
// mission update use case. mission_id is intentionally absent — moving an
// indicator between missions is not supported (would require a dedicated use
// case with cross-mission validation).
type UpdateCommand struct {
	OrganizationID domain.TenantID
	ID             uuid.UUID
	Title          *string
	Description    *string
	OwnerID        *uuid.UUID
	TargetValue    *float64
	CurrentValue   *float64
	Unit           *string
	Status         *string
	SortOrder      *int
	DueDate        *time.Time
}

type UpdateUseCase struct {
	indicators domainindicator.Repository
	users      domainuser.Repository
	logger     *slog.Logger
}

func NewUpdateUseCase(
	indicators domainindicator.Repository,
	users domainuser.Repository,
	logger *slog.Logger,
) *UpdateUseCase {
	return &UpdateUseCase{indicators: indicators, users: users, logger: logger}
}

func (uc *UpdateUseCase) Execute(ctx context.Context, cmd UpdateCommand) (*domainindicator.Indicator, error) {
	uc.logger.DebugContext(ctx, "update indicator", "indicator_id", cmd.ID, "org_id", cmd.OrganizationID)
	orgID := cmd.OrganizationID.UUID()

	existing, err := uc.indicators.GetByID(ctx, cmd.ID, orgID)
	if err != nil {
		return nil, err
	}

	if cmd.OwnerID != nil && *cmd.OwnerID != existing.OwnerID {
		if _, err := uc.users.GetActiveMemberByID(ctx, *cmd.OwnerID, orgID); err != nil {
			if errors.Is(err, domainuser.ErrNotFound) {
				return nil, domainindicator.ErrInvalidReference
			}
			return nil, err
		}
	}

	if cmd.Title != nil {
		existing.Title = *cmd.Title
	}
	if cmd.Description != nil {
		existing.Description = cmd.Description
	}
	if cmd.OwnerID != nil {
		existing.OwnerID = *cmd.OwnerID
	}
	if cmd.TargetValue != nil {
		existing.TargetValue = cmd.TargetValue
	}
	if cmd.CurrentValue != nil {
		existing.CurrentValue = cmd.CurrentValue
	}
	if cmd.Unit != nil {
		existing.Unit = cmd.Unit
	}
	if cmd.Status != nil {
		existing.Status = domainindicator.Status(*cmd.Status)
	}
	if cmd.SortOrder != nil {
		existing.SortOrder = *cmd.SortOrder
	}
	if cmd.DueDate != nil {
		existing.DueDate = cmd.DueDate
	}

	if err := existing.Validate(); err != nil {
		return nil, err
	}

	updated, err := uc.indicators.Update(ctx, existing)
	if err != nil {
		uc.logger.WarnContext(ctx, "update indicator failed", "indicator_id", cmd.ID, "error", err)
		return nil, err
	}
	uc.logger.InfoContext(ctx, "indicator updated", "indicator_id", updated.ID)
	return updated, nil
}
