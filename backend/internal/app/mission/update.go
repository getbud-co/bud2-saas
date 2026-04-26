package mission

import (
	"context"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domainmission "github.com/getbud-co/bud2/backend/internal/domain/mission"
)

// PatchCommand is the JSON Merge Patch projection of an update request.
// All optional fields are pointers: only non-nil fields are applied to the
// existing mission. parent_id is deliberately absent — reparent is not
// exposed via PATCH (the UI does not surface it; when it does, it will be
// a dedicated feature with structural cycle prevention).
type PatchCommand struct {
	OrganizationID domain.TenantID
	ID             uuid.UUID

	Title        *string
	Description  *string
	CycleID      *uuid.UUID
	OwnerID      *uuid.UUID
	TeamID       *uuid.UUID
	Status       *string
	Visibility   *string
	KanbanStatus *string
	SortOrder    *int
	DueDate      *time.Time
}

type PatchUseCase struct {
	missions   domainmission.Repository
	references ReferenceChecker
	logger     *slog.Logger
}

func NewPatchUseCase(missions domainmission.Repository, references ReferenceChecker, logger *slog.Logger) *PatchUseCase {
	return &PatchUseCase{missions: missions, references: references, logger: logger}
}

func (uc *PatchUseCase) Execute(ctx context.Context, cmd PatchCommand) (*domainmission.Mission, error) {
	uc.logger.DebugContext(ctx, "patch mission", "mission_id", cmd.ID, "org_id", cmd.OrganizationID)
	orgID := cmd.OrganizationID.UUID()

	existing, err := uc.missions.GetByID(ctx, cmd.ID, orgID)
	if err != nil {
		return nil, err
	}

	// Cross-resource references: validate only when the field is being changed.
	if cmd.OwnerID != nil && *cmd.OwnerID != existing.OwnerID {
		if err := uc.references.CheckUserInOrg(ctx, *cmd.OwnerID, orgID); err != nil {
			return nil, err
		}
	}
	if cmd.CycleID != nil && (existing.CycleID == nil || *cmd.CycleID != *existing.CycleID) {
		if err := uc.references.CheckCycleInOrg(ctx, *cmd.CycleID, orgID); err != nil {
			return nil, err
		}
	}
	if cmd.TeamID != nil && (existing.TeamID == nil || *cmd.TeamID != *existing.TeamID) {
		if err := uc.references.CheckTeamInOrg(ctx, *cmd.TeamID, orgID); err != nil {
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
	if cmd.CycleID != nil {
		existing.CycleID = cmd.CycleID
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
	if cmd.SortOrder != nil {
		existing.SortOrder = *cmd.SortOrder
	}
	if cmd.DueDate != nil {
		existing.DueDate = cmd.DueDate
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
		uc.logger.WarnContext(ctx, "patch mission failed", "mission_id", cmd.ID, "error", err)
		return nil, err
	}
	uc.logger.InfoContext(ctx, "mission patched", "mission_id", updated.ID)
	return updated, nil
}
