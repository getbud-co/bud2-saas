package mission

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domainmission "github.com/getbud-co/bud2/backend/internal/domain/mission"
)

type CreateCommand struct {
	OrganizationID domain.TenantID
	Title          string
	Description    *string
	CycleID        *uuid.UUID
	ParentID       *uuid.UUID
	OwnerID        uuid.UUID
	TeamID         *uuid.UUID
	Status         string
	Visibility     string
	KanbanStatus   string
	SortOrder      int
	DueDate        *time.Time
}

type CreateUseCase struct {
	missions   domainmission.Repository
	references ReferenceChecker
	logger     *slog.Logger
}

func NewCreateUseCase(missions domainmission.Repository, references ReferenceChecker, logger *slog.Logger) *CreateUseCase {
	return &CreateUseCase{missions: missions, references: references, logger: logger}
}

func (uc *CreateUseCase) Execute(ctx context.Context, cmd CreateCommand) (*domainmission.Mission, error) {
	uc.logger.DebugContext(ctx, "create mission", "org_id", cmd.OrganizationID, "title", cmd.Title)

	orgID := cmd.OrganizationID.UUID()

	if cmd.ParentID != nil {
		if _, err := uc.missions.GetByID(ctx, *cmd.ParentID, orgID); err != nil {
			if errors.Is(err, domainmission.ErrNotFound) {
				return nil, domainmission.ErrInvalidParent
			}
			return nil, err
		}
	}
	if err := uc.references.CheckUserInOrg(ctx, cmd.OwnerID, orgID); err != nil {
		return nil, err
	}
	if cmd.CycleID != nil {
		if err := uc.references.CheckCycleInOrg(ctx, *cmd.CycleID, orgID); err != nil {
			return nil, err
		}
	}
	if cmd.TeamID != nil {
		if err := uc.references.CheckTeamInOrg(ctx, *cmd.TeamID, orgID); err != nil {
			return nil, err
		}
	}

	status := domainmission.Status(cmd.Status)
	if status == "" {
		status = domainmission.StatusDraft
	}
	visibility := domainmission.Visibility(cmd.Visibility)
	if visibility == "" {
		visibility = domainmission.VisibilityPublic
	}
	kanban := domainmission.KanbanStatus(cmd.KanbanStatus)
	if kanban == "" {
		kanban = domainmission.KanbanUncategorized
	}

	m := &domainmission.Mission{
		ID:             uuid.New(),
		OrganizationID: orgID,
		CycleID:        cmd.CycleID,
		ParentID:       cmd.ParentID,
		OwnerID:        cmd.OwnerID,
		TeamID:         cmd.TeamID,
		Title:          cmd.Title,
		Description:    cmd.Description,
		Status:         status,
		Visibility:     visibility,
		KanbanStatus:   kanban,
		SortOrder:      cmd.SortOrder,
		DueDate:        cmd.DueDate,
	}
	if err := m.Validate(); err != nil {
		return nil, err
	}

	created, err := uc.missions.Create(ctx, m)
	if err != nil {
		uc.logger.WarnContext(ctx, "create mission failed", "error", err)
		return nil, err
	}
	uc.logger.InfoContext(ctx, "mission created", "mission_id", created.ID)
	return created, nil
}
