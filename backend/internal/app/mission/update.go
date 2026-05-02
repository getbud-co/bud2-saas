package mission

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/google/uuid"

	apptx "github.com/getbud-co/bud2/backend/internal/app/tx"
	"github.com/getbud-co/bud2/backend/internal/domain"
	domainmission "github.com/getbud-co/bud2/backend/internal/domain/mission"
	domaintag "github.com/getbud-co/bud2/backend/internal/domain/tag"
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
	Members        *[]MemberInput // nil = don't touch; &[]MemberInput{} = clear all
	TagIDs         *[]uuid.UUID   // nil = don't touch; &[]uuid.UUID{} = clear all
}

type UpdateUseCase struct {
	missions domainmission.Repository
	txm      apptx.Manager
	logger   *slog.Logger
}

func NewUpdateUseCase(
	missions domainmission.Repository,
	txm apptx.Manager,
	logger *slog.Logger,
) *UpdateUseCase {
	return &UpdateUseCase{missions: missions, txm: txm, logger: logger}
}

func (uc *UpdateUseCase) Execute(ctx context.Context, cmd UpdateCommand) (*domainmission.Mission, error) {
	uc.logger.DebugContext(ctx, "update mission", "mission_id", cmd.ID, "org_id", cmd.OrganizationID)
	orgID := cmd.OrganizationID.UUID()

	var updated *domainmission.Mission
	err := uc.txm.WithTx(ctx, func(repos apptx.Repositories) error {
		existing, err := repos.Missions().GetByID(ctx, cmd.ID, orgID)
		if err != nil {
			return err
		}

		// Cross-resource references: validate only when the field is being changed.
		// Each repo's getter is already org-scoped — domain.ErrNotFound covers
		// both "doesn't exist" and "exists in another tenant".
		if cmd.OwnerID != nil && *cmd.OwnerID != existing.OwnerID {
			if _, err := repos.Users().GetActiveMemberByID(ctx, *cmd.OwnerID, orgID); err != nil {
				if errors.Is(err, domainuser.ErrNotFound) {
					return domainmission.ErrInvalidReference
				}
				return err
			}
		}
		if cmd.TeamID != nil && (existing.TeamID == nil || *cmd.TeamID != *existing.TeamID) {
			if _, err := repos.Teams().GetByID(ctx, *cmd.TeamID, orgID); err != nil {
				if errors.Is(err, domainteam.ErrNotFound) {
					return domainmission.ErrInvalidReference
				}
				return err
			}
		}

		// Replace tags when provided; nil means "don't touch".
		if cmd.TagIDs != nil {
			tagIDs := deduplicateUUIDs(*cmd.TagIDs)
			for _, tagID := range tagIDs {
				if _, err := repos.Tags().GetByID(ctx, tagID, orgID); err != nil {
					if errors.Is(err, domaintag.ErrNotFound) {
						return domainmission.ErrInvalidReference
					}
					return err
				}
			}
		}

		// Replace members when provided; nil means "don't touch".
		if cmd.Members != nil {
			seenMembers := map[uuid.UUID]struct{}{}
			newMembers := make([]domainmission.Member, 0, len(*cmd.Members))
			for _, in := range *cmd.Members {
				if _, dup := seenMembers[in.UserID]; dup {
					continue
				}
				seenMembers[in.UserID] = struct{}{}
				if _, err := repos.Users().GetActiveMemberByID(ctx, in.UserID, orgID); err != nil {
					if errors.Is(err, domainuser.ErrNotFound) {
						return domainmission.ErrInvalidReference
					}
					return err
				}
				// OrganizationID and MissionID are intentionally left zero-valued;
				// ReplaceMembers calls normalizeMembers which propagates them from the aggregate.
				newMembers = append(newMembers, domainmission.Member{
					UserID: in.UserID,
					Role:   in.Role,
				})
			}
			if err := existing.ReplaceMembers(newMembers); err != nil {
				return err
			}
		}

		// Apply only fields that were sent.
		if cmd.Title != nil {
			if err := existing.Rename(*cmd.Title); err != nil {
				return err
			}
		}
		if cmd.Description != nil {
			if err := existing.ChangeDescription(cmd.Description); err != nil {
				return err
			}
		}
		if cmd.OwnerID != nil {
			if err := existing.ChangeOwner(*cmd.OwnerID); err != nil {
				return err
			}
		}
		if cmd.TeamID != nil {
			if err := existing.AssignTeam(*cmd.TeamID); err != nil {
				return err
			}
		}
		if cmd.Status != nil {
			if err := existing.ChangeStatus(domainmission.Status(*cmd.Status), time.Now().UTC()); err != nil {
				return err
			}
		}
		if cmd.Visibility != nil {
			if err := existing.ChangeVisibility(domainmission.Visibility(*cmd.Visibility)); err != nil {
				return err
			}
		}
		if cmd.KanbanStatus != nil {
			if err := existing.ChangeKanbanStatus(domainmission.KanbanStatus(*cmd.KanbanStatus)); err != nil {
				return err
			}
		}
		if cmd.StartDate != nil || cmd.EndDate != nil {
			start := existing.StartDate
			end := existing.EndDate
			if cmd.StartDate != nil {
				start = *cmd.StartDate
			}
			if cmd.EndDate != nil {
				end = *cmd.EndDate
			}
			period, err := domain.NewTimeRange(start, end)
			if err != nil {
				return err
			}
			if err := existing.Reschedule(period); err != nil {
				return err
			}
		}

		if cmd.TagIDs != nil {
			if err := existing.ReplaceTagIDs(*cmd.TagIDs); err != nil {
				return err
			}
		}

		updated, err = repos.Missions().Update(ctx, existing)
		return err
	})
	if err != nil {
		uc.logger.WarnContext(ctx, "update mission failed", "mission_id", cmd.ID, "error", err)
		return nil, err
	}
	uc.logger.InfoContext(ctx, "mission updated", "mission_id", updated.ID)
	return updated, nil
}

func deduplicateUUIDs(ids []uuid.UUID) []uuid.UUID {
	seen := make(map[uuid.UUID]struct{}, len(ids))
	out := make([]uuid.UUID, 0, len(ids))
	for _, id := range ids {
		if _, dup := seen[id]; dup {
			continue
		}
		seen[id] = struct{}{}
		out = append(out, id)
	}
	return out
}
