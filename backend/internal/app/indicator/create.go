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
	domainuser "github.com/getbud-co/bud2/backend/internal/domain/user"
)

type CreateCommand struct {
	OrganizationID domain.TenantID
	MissionID      uuid.UUID
	OwnerID        uuid.UUID
	Title          string
	Description    *string
	TargetValue    *float64
	CurrentValue   *float64
	Unit           *string
	Status         string
	SortOrder      int
	DueDate        *time.Time
}

type CreateUseCase struct {
	indicators domainindicator.Repository
	missions   domainmission.Repository
	users      domainuser.Repository
	logger     *slog.Logger
}

func NewCreateUseCase(
	indicators domainindicator.Repository,
	missions domainmission.Repository,
	users domainuser.Repository,
	logger *slog.Logger,
) *CreateUseCase {
	return &CreateUseCase{indicators: indicators, missions: missions, users: users, logger: logger}
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

	status := domainindicator.Status(cmd.Status)
	if status == "" {
		status = domainindicator.StatusDraft
	}

	i := &domainindicator.Indicator{
		ID:             uuid.New(),
		OrganizationID: orgID,
		MissionID:      cmd.MissionID,
		OwnerID:        cmd.OwnerID,
		Title:          cmd.Title,
		Description:    cmd.Description,
		TargetValue:    cmd.TargetValue,
		CurrentValue:   cmd.CurrentValue,
		Unit:           cmd.Unit,
		Status:         status,
		SortOrder:      cmd.SortOrder,
		DueDate:        cmd.DueDate,
	}
	if err := i.Validate(); err != nil {
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
