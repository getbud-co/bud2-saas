package mission

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domainmission "github.com/getbud-co/bud2/backend/internal/domain/mission"
	domainteam "github.com/getbud-co/bud2/backend/internal/domain/team"
	domainuser "github.com/getbud-co/bud2/backend/internal/domain/user"
)

// UpdateCommand carries the partial-update intent: every optional field is
// a pointer, and only non-nil fields are applied to the existing mission.
// HTTP layer maps PATCH bodies to this command; the use case is unaware of
// the verb. parent_id is deliberately absent — reparent is not exposed
// via this update path (the UI does not surface it; when it does, it will
// be a dedicated feature with structural cycle prevention).
type UpdateCommand struct {
	OrganizationID domain.TenantID
	ID             uuid.UUID
	Title          *string
	Description    *string
	OwnerID        *uuid.UUID
	TeamID         *uuid.UUID
	Status         *string
	Visibility     *string
	KanbanStatus   *string
	StartDate      *time.Time
	EndDate        *time.Time
}

type UpdateUseCase struct {
	missions domainmission.Repository
	teams    domainteam.Repository
	users    domainuser.Repository
	logger   *slog.Logger
}

func NewUpdateUseCase(
	missions domainmission.Repository,
	teams domainteam.Repository,
	users domainuser.Repository,
	logger *slog.Logger,
) *UpdateUseCase {
	return &UpdateUseCase{missions: missions, teams: teams, users: users, logger: logger}
}

func (uc *UpdateUseCase) Execute(ctx context.Context, cmd UpdateCommand) (*domainmission.Mission, error) {
	uc.logger.DebugContext(ctx, "update mission", "mission_id", cmd.ID, "org_id", cmd.OrganizationID)
	orgID := cmd.OrganizationID.UUID()

	existing, err := uc.missions.GetByID(ctx, cmd.ID, orgID)
	if err != nil {
		return nil, err
	}

	// Cross-resource references: validate only when the field is being changed.
	// Each repo's getter is already org-scoped — domain.ErrNotFound covers
	// both "doesn't exist" and "exists in another tenant".
	if cmd.OwnerID != nil && *cmd.OwnerID != existing.OwnerID {
		if _, err := uc.users.GetActiveMemberByID(ctx, *cmd.OwnerID, orgID); err != nil {
			if errors.Is(err, domainuser.ErrNotFound) {
				return nil, domainmission.ErrInvalidReference
			}
			return nil, err
		}
	}
	if cmd.TeamID != nil && (existing.TeamID == nil || *cmd.TeamID != *existing.TeamID) {
		if _, err := uc.teams.GetByID(ctx, *cmd.TeamID, orgID); err != nil {
			if errors.Is(err, domainteam.ErrNotFound) {
				return nil, domainmission.ErrInvalidReference
			}
			return nil, err
		}
	}

	// Apply only fields that were sent.
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
	if cmd.Status != nil {
		existing.Status = domainmission.Status(*cmd.Status)
	}
	if cmd.Visibility != nil {
		existing.Visibility = domainmission.Visibility(*cmd.Visibility)
	}
	if cmd.KanbanStatus != nil {
		existing.KanbanStatus = domainmission.KanbanStatus(*cmd.KanbanStatus)
	}
	if cmd.StartDate != nil {
		existing.StartDate = *cmd.StartDate
	}
	if cmd.EndDate != nil {
		existing.EndDate = *cmd.EndDate
	}

	// completed_at lifecycle: auto-fill on transition to completed, clear on
	// transition out. Driven by the resulting status, regardless of which
	// fields were patched in this request.
	if existing.Status == domainmission.StatusCompleted && existing.CompletedAt == nil {
		now := time.Now().UTC()
		existing.CompletedAt = &now
	}
	if existing.Status != domainmission.StatusCompleted && existing.CompletedAt != nil {
		existing.CompletedAt = nil
	}

	if err := existing.Validate(); err != nil {
		return nil, err
	}

	updated, err := uc.missions.Update(ctx, existing)
	if err != nil {
		uc.logger.WarnContext(ctx, "update mission failed", "mission_id", cmd.ID, "error", err)
		return nil, err
	}
	uc.logger.InfoContext(ctx, "mission updated", "mission_id", updated.ID)
	return updated, nil
}
