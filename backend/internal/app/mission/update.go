package mission

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domainmission "github.com/getbud-co/bud2/backend/internal/domain/mission"
)

type UpdateCommand struct {
	OrganizationID domain.TenantID
	ID             uuid.UUID
	Title          string
	Description    *string
	CycleID        *uuid.UUID
	// ParentID is only applied when SetParentID is true. This split exists
	// because the frontend edit form does not always carry parent_id, and
	// silently applying nil would detach the mission on every update.
	ParentID     *uuid.UUID
	SetParentID  bool
	OwnerID      uuid.UUID
	TeamID       *uuid.UUID
	Status       string
	Visibility   string
	KanbanStatus string
	SortOrder    int
	DueDate      *time.Time
}

type UpdateUseCase struct {
	missions   domainmission.Repository
	references ReferenceChecker
	logger     *slog.Logger
}

func NewUpdateUseCase(missions domainmission.Repository, references ReferenceChecker, logger *slog.Logger) *UpdateUseCase {
	return &UpdateUseCase{missions: missions, references: references, logger: logger}
}

func (uc *UpdateUseCase) Execute(ctx context.Context, cmd UpdateCommand) (*domainmission.Mission, error) {
	uc.logger.DebugContext(ctx, "update mission", "mission_id", cmd.ID, "org_id", cmd.OrganizationID)
	orgID := cmd.OrganizationID.UUID()

	existing, err := uc.missions.GetByID(ctx, cmd.ID, orgID)
	if err != nil {
		return nil, err
	}

	if cmd.SetParentID {
		if err := uc.validateParentChange(ctx, orgID, cmd.ID, existing.ParentID, cmd.ParentID); err != nil {
			return nil, err
		}
		existing.ParentID = cmd.ParentID
	}

	// Validate cross-resource references against the active tenant. Done only
	// when the value actually changes to avoid extra round-trips on no-op
	// updates (e.g., editing only the title).
	if cmd.OwnerID != existing.OwnerID {
		if err := uc.references.CheckUserInOrg(ctx, cmd.OwnerID, orgID); err != nil {
			return nil, err
		}
	}
	if !equalUUIDPtr(cmd.CycleID, existing.CycleID) && cmd.CycleID != nil {
		if err := uc.references.CheckCycleInOrg(ctx, *cmd.CycleID, orgID); err != nil {
			return nil, err
		}
	}
	if !equalUUIDPtr(cmd.TeamID, existing.TeamID) && cmd.TeamID != nil {
		if err := uc.references.CheckTeamInOrg(ctx, *cmd.TeamID, orgID); err != nil {
			return nil, err
		}
	}

	existing.Title = cmd.Title
	existing.Description = cmd.Description
	existing.CycleID = cmd.CycleID
	existing.OwnerID = cmd.OwnerID
	existing.TeamID = cmd.TeamID
	existing.Status = domainmission.Status(cmd.Status)
	existing.Visibility = domainmission.Visibility(cmd.Visibility)
	existing.KanbanStatus = domainmission.KanbanStatus(cmd.KanbanStatus)
	existing.SortOrder = cmd.SortOrder
	existing.DueDate = cmd.DueDate

	// auto-fill completed_at when transitioning to completed
	if existing.Status == domainmission.StatusCompleted && existing.CompletedAt == nil {
		now := time.Now().UTC()
		existing.CompletedAt = &now
	}
	// clear completed_at when transitioning out of completed
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

// validateParentChange runs the cycle-prevention checks only when ParentID is
// actually changing. A no-op change (same parent, including both nil) skips the
// repository round-trips.
//
// Known limitation (TOCTOU): the validate-then-update sequence is not wrapped
// in a transaction, so two concurrent reparents can both pass IsDescendant
// against independent snapshots and then both commit, producing a cycle in the
// tree. The recursive CTEs in infra/postgres/sql/* track visited paths and
// terminate even if a cycle exists in the data, so a transient violation does
// not lock up the repo. Closing the race fully requires a serializable
// transaction or an advisory lock around this method + Update — see the
// project memory and review feedback.
func (uc *UpdateUseCase) validateParentChange(ctx context.Context, orgID, missionID uuid.UUID, current, next *uuid.UUID) error {
	if equalUUIDPtr(current, next) {
		return nil
	}
	if next == nil {
		return nil
	}
	if *next == missionID {
		return fmt.Errorf("%w: cannot set mission as its own parent", domainmission.ErrInvalidParent)
	}
	if _, err := uc.missions.GetByID(ctx, *next, orgID); err != nil {
		if errors.Is(err, domainmission.ErrNotFound) {
			return domainmission.ErrInvalidParent
		}
		return err
	}
	isDesc, err := uc.missions.IsDescendant(ctx, orgID, missionID, *next)
	if err != nil {
		return err
	}
	if isDesc {
		return fmt.Errorf("%w: cannot move mission under one of its descendants (cycle)", domainmission.ErrInvalidParent)
	}
	return nil
}

func equalUUIDPtr(a, b *uuid.UUID) bool {
	if a == nil && b == nil {
		return true
	}
	if a == nil || b == nil {
		return false
	}
	return *a == *b
}
