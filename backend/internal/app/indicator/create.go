package indicator

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domainindicator "github.com/getbud-co/bud2/backend/internal/domain/indicator"
	domainmission "github.com/getbud-co/bud2/backend/internal/domain/mission"
	domainteam "github.com/getbud-co/bud2/backend/internal/domain/team"
	domainuser "github.com/getbud-co/bud2/backend/internal/domain/user"
)

type CreateCommand struct {
	OrganizationID  domain.TenantID
	MissionID       uuid.UUID
	OwnerID         uuid.UUID
	TeamID          *uuid.UUID
	Title           string
	Description     *string
	TargetValue     *float64
	CurrentValue    *float64
	Unit            *string
	Status          string
	DueDate         *time.Time
	MeasurementMode string
	GoalType        string
	LowThreshold    *float64
	HighThreshold   *float64
	PeriodStart     *time.Time
	PeriodEnd       *time.Time
	LinkedSurveyID  *uuid.UUID
}

type CreateUseCase struct {
	indicators domainindicator.Repository
	missions   domainmission.Repository
	teams      domainteam.Repository
	users      domainuser.Repository
	logger     *slog.Logger
}

func NewCreateUseCase(
	indicators domainindicator.Repository,
	missions domainmission.Repository,
	teams domainteam.Repository,
	users domainuser.Repository,
	logger *slog.Logger,
) *CreateUseCase {
	return &CreateUseCase{indicators: indicators, missions: missions, teams: teams, users: users, logger: logger}
}

func (uc *CreateUseCase) Execute(ctx context.Context, cmd CreateCommand) (*domainindicator.Indicator, error) {
	uc.logger.DebugContext(ctx, "create indicator", "org_id", cmd.OrganizationID, "mission_id", cmd.MissionID, "title", cmd.Title)
	orgID := cmd.OrganizationID.UUID()

	// Mission must exist in this org. The repo getter is org-scoped, so
	// ErrNotFound here also covers cross-tenant references.
	if _, err := uc.missions.GetByID(ctx, cmd.MissionID, orgID); err != nil {
		if errors.Is(err, domainmission.ErrNotFound) {
			return nil, domainindicator.ErrInvalidReference
		}
		return nil, err
	}
	if _, err := uc.users.GetActiveMemberByID(ctx, cmd.OwnerID, orgID); err != nil {
		if errors.Is(err, domainuser.ErrNotFound) {
			return nil, domainindicator.ErrInvalidReference
		}
		return nil, err
	}
	if cmd.TeamID != nil {
		if _, err := uc.teams.GetByID(ctx, *cmd.TeamID, orgID); err != nil {
			if errors.Is(err, domainteam.ErrNotFound) {
				return nil, domainindicator.ErrInvalidReference
			}
			return nil, err
		}
	}

	opts := []domainindicator.IndicatorOption{
		domainindicator.WithDescription(cmd.Description),
		domainindicator.WithTargetValue(cmd.TargetValue),
		domainindicator.WithCurrentValue(cmd.CurrentValue),
		domainindicator.WithUnit(cmd.Unit),
		domainindicator.WithDueDate(cmd.DueDate),
		domainindicator.WithLowThreshold(cmd.LowThreshold),
		domainindicator.WithHighThreshold(cmd.HighThreshold),
		domainindicator.WithPeriodStart(cmd.PeriodStart),
		domainindicator.WithPeriodEnd(cmd.PeriodEnd),
	}
	if cmd.Status != "" {
		opts = append(opts, domainindicator.WithStatus(domainindicator.Status(cmd.Status)))
	}
	if cmd.MeasurementMode != "" {
		opts = append(opts, domainindicator.WithMeasurementMode(domainindicator.MeasurementMode(cmd.MeasurementMode)))
	}
	if cmd.GoalType != "" {
		opts = append(opts, domainindicator.WithGoalType(domainindicator.GoalType(cmd.GoalType)))
	}
	if cmd.TeamID != nil {
		opts = append(opts, domainindicator.WithTeam(*cmd.TeamID))
	}
	if cmd.LinkedSurveyID != nil {
		opts = append(opts, domainindicator.WithLinkedSurvey(*cmd.LinkedSurveyID))
	}

	i, err := domainindicator.NewIndicator(orgID, cmd.MissionID, cmd.OwnerID, cmd.Title, opts...)
	if err != nil {
		return nil, err
	}

	created, err := uc.indicators.Create(ctx, i)
	if err != nil {
		uc.logger.WarnContext(ctx, "create indicator failed", "error", err)
		return nil, err
	}
	uc.logger.InfoContext(ctx, "indicator created", "indicator_id", created.ID)
	return created, nil
}
