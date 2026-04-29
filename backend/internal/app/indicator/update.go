package indicator

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domainindicator "github.com/getbud-co/bud2/backend/internal/domain/indicator"
	domainteam "github.com/getbud-co/bud2/backend/internal/domain/team"
	domainuser "github.com/getbud-co/bud2/backend/internal/domain/user"
)

// UpdateCommand carries the partial-update intent: every optional field is a
// pointer, only non-nil fields are applied. Same Merge-Patch semantics as the
// mission update use case. mission_id is intentionally absent — moving an
// indicator between missions is not supported (would require a dedicated use
// case with cross-mission validation).
type UpdateCommand struct {
	OrganizationID  domain.TenantID
	ID              uuid.UUID
	Title           *string
	Description     *string
	OwnerID         *uuid.UUID
	TeamID          *uuid.UUID
	TargetValue     *float64
	CurrentValue    *float64
	Unit            *string
	Status          *string
	DueDate         *time.Time
	MeasurementMode *string
	GoalType        *string
	LowThreshold    *float64
	HighThreshold   *float64
	PeriodStart     *time.Time
	PeriodEnd       *time.Time
	LinkedSurveyID  *uuid.UUID
}

type UpdateUseCase struct {
	indicators domainindicator.Repository
	teams      domainteam.Repository
	users      domainuser.Repository
	logger     *slog.Logger
}

func NewUpdateUseCase(
	indicators domainindicator.Repository,
	teams domainteam.Repository,
	users domainuser.Repository,
	logger *slog.Logger,
) *UpdateUseCase {
	return &UpdateUseCase{indicators: indicators, teams: teams, users: users, logger: logger}
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
	if cmd.TeamID != nil {
		if _, err := uc.teams.GetByID(ctx, *cmd.TeamID, orgID); err != nil {
			if errors.Is(err, domainteam.ErrNotFound) {
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
	if cmd.TeamID != nil {
		existing.TeamID = cmd.TeamID
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
	if cmd.DueDate != nil {
		existing.DueDate = cmd.DueDate
	}
	if cmd.MeasurementMode != nil {
		existing.MeasurementMode = domainindicator.MeasurementMode(*cmd.MeasurementMode)
	}
	if cmd.GoalType != nil {
		existing.GoalType = domainindicator.GoalType(*cmd.GoalType)
	}
	if cmd.LowThreshold != nil {
		existing.LowThreshold = cmd.LowThreshold
	}
	if cmd.HighThreshold != nil {
		existing.HighThreshold = cmd.HighThreshold
	}
	if cmd.PeriodStart != nil {
		existing.PeriodStart = cmd.PeriodStart
	}
	if cmd.PeriodEnd != nil {
		existing.PeriodEnd = cmd.PeriodEnd
	}
	if cmd.LinkedSurveyID != nil {
		existing.LinkedSurveyID = cmd.LinkedSurveyID
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
