package mission

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/google/uuid"

	apptx "github.com/getbud-co/bud2/backend/internal/app/tx"
	"github.com/getbud-co/bud2/backend/internal/domain"
	domainindicator "github.com/getbud-co/bud2/backend/internal/domain/indicator"
	domainmission "github.com/getbud-co/bud2/backend/internal/domain/mission"
	domaintask "github.com/getbud-co/bud2/backend/internal/domain/task"
	domainteam "github.com/getbud-co/bud2/backend/internal/domain/team"
	domainuser "github.com/getbud-co/bud2/backend/internal/domain/user"
)

// CreateIndicatorInput is the inline shape for indicators created together with
// a mission. owner_id defaults to the mission owner when omitted.
type CreateIndicatorInput struct {
	OwnerID      *uuid.UUID
	Title        string
	Description  *string
	TargetValue  *float64
	CurrentValue *float64
	Unit         *string
	Status       string
	DueDate      *time.Time
}

// CreateTaskInput is the inline shape for tasks created together with a
// mission. assignee_id defaults to the mission owner when omitted. The
// task may also be nested under one of the inline indicators (referenced
// by IndicatorIndex into Indicators[]) or under an existing indicator
// already on the server (IndicatorID); both are optional and only one
// should be set.
type CreateTaskInput struct {
	AssigneeID     *uuid.UUID
	IndicatorID    *uuid.UUID
	IndicatorIndex *int
	Title          string
	Description    *string
	Status         string
	DueDate        *time.Time
}

// CreateResult is what the use case returns when the request includes nested
// children. The mission is always populated; the slices reflect the order the
// caller provided in the request, with server-generated ids attached.
type CreateResult struct {
	Mission    *domainmission.Mission
	Indicators []domainindicator.Indicator
	Tasks      []domaintask.Task
}

type CreateCommand struct {
	OrganizationID domain.TenantID
	Title          string
	Description    *string
	ParentID       *uuid.UUID
	OwnerID        uuid.UUID
	TeamID         *uuid.UUID
	Status         string
	Visibility     string
	KanbanStatus   string
	StartDate      time.Time
	EndDate        time.Time
	Indicators     []CreateIndicatorInput
	Tasks          []CreateTaskInput
}

type CreateUseCase struct {
	missions domainmission.Repository
	teams    domainteam.Repository
	users    domainuser.Repository
	txm      apptx.Manager
	logger   *slog.Logger
}

func NewCreateUseCase(
	missions domainmission.Repository,
	teams domainteam.Repository,
	users domainuser.Repository,
	txm apptx.Manager,
	logger *slog.Logger,
) *CreateUseCase {
	return &CreateUseCase{missions: missions, teams: teams, users: users, txm: txm, logger: logger}
}

func (uc *CreateUseCase) Execute(ctx context.Context, cmd CreateCommand) (*CreateResult, error) {
	uc.logger.DebugContext(ctx, "create mission", "org_id", cmd.OrganizationID, "title", cmd.Title, "indicators", len(cmd.Indicators), "tasks", len(cmd.Tasks))
	orgID := cmd.OrganizationID.UUID()

	// Cross-resource references are validated up front, outside the transaction.
	// The transaction below only opens once we know the references resolve.
	if cmd.ParentID != nil {
		if _, err := uc.missions.GetByID(ctx, *cmd.ParentID, orgID); err != nil {
			if errors.Is(err, domainmission.ErrNotFound) {
				return nil, domainmission.ErrInvalidParent
			}
			return nil, err
		}
	}
	if _, err := uc.users.GetActiveMemberByID(ctx, cmd.OwnerID, orgID); err != nil {
		if errors.Is(err, domainuser.ErrNotFound) {
			return nil, domainmission.ErrInvalidReference
		}
		return nil, err
	}
	if cmd.TeamID != nil {
		if _, err := uc.teams.GetByID(ctx, *cmd.TeamID, orgID); err != nil {
			if errors.Is(err, domainteam.ErrNotFound) {
				return nil, domainmission.ErrInvalidReference
			}
			return nil, err
		}
	}

	// Validate every indicator/task owner up front too, with the same mapping
	// rule. Owners default to the mission owner, which we already validated.
	//
	// Invariant: cmd.OwnerID is pre-populated in seenOwners ONLY because the
	// mission-owner block above has already called users.GetActiveMemberByID
	// for it. If a future refactor moves that block, this dedup must move
	// with it — otherwise a stale or invalid owner would skip validation.
	seenOwners := map[uuid.UUID]struct{}{cmd.OwnerID: {}}
	for _, in := range cmd.Indicators {
		owner := cmd.OwnerID
		if in.OwnerID != nil {
			owner = *in.OwnerID
		}
		if _, ok := seenOwners[owner]; ok {
			continue
		}
		if _, err := uc.users.GetActiveMemberByID(ctx, owner, orgID); err != nil {
			if errors.Is(err, domainuser.ErrNotFound) {
				return nil, domainindicator.ErrInvalidReference
			}
			return nil, err
		}
		seenOwners[owner] = struct{}{}
	}
	for _, tk := range cmd.Tasks {
		assignee := cmd.OwnerID
		if tk.AssigneeID != nil {
			assignee = *tk.AssigneeID
		}
		if _, ok := seenOwners[assignee]; ok {
			continue
		}
		if _, err := uc.users.GetActiveMemberByID(ctx, assignee, orgID); err != nil {
			if errors.Is(err, domainuser.ErrNotFound) {
				return nil, domaintask.ErrInvalidReference
			}
			return nil, err
		}
		seenOwners[assignee] = struct{}{}
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
		ParentID:       cmd.ParentID,
		OwnerID:        cmd.OwnerID,
		TeamID:         cmd.TeamID,
		Title:          cmd.Title,
		Description:    cmd.Description,
		Status:         status,
		Visibility:     visibility,
		KanbanStatus:   kanban,
		StartDate:      cmd.StartDate,
		EndDate:        cmd.EndDate,
	}
	if err := m.Validate(); err != nil {
		return nil, err
	}

	// Pre-build child entities so Validate() runs before we open a transaction.
	// Each child borrows the eventual mission_id on commit.
	indicators := make([]*domainindicator.Indicator, 0, len(cmd.Indicators))
	for _, in := range cmd.Indicators {
		owner := cmd.OwnerID
		if in.OwnerID != nil {
			owner = *in.OwnerID
		}
		indStatus := domainindicator.Status(in.Status)
		if indStatus == "" {
			indStatus = domainindicator.StatusDraft
		}
		ind := &domainindicator.Indicator{
			ID:             uuid.New(),
			OrganizationID: orgID,
			MissionID:      m.ID,
			OwnerID:        owner,
			Title:          in.Title,
			Description:    in.Description,
			TargetValue:    in.TargetValue,
			CurrentValue:   in.CurrentValue,
			Unit:           in.Unit,
			Status:         indStatus,
			DueDate:        in.DueDate,
		}
		if err := ind.Validate(); err != nil {
			return nil, err
		}
		indicators = append(indicators, ind)
	}

	tasks := make([]*domaintask.Task, 0, len(cmd.Tasks))
	for _, tk := range cmd.Tasks {
		assignee := cmd.OwnerID
		if tk.AssigneeID != nil {
			assignee = *tk.AssigneeID
		}
		taskStatus := domaintask.Status(tk.Status)
		if taskStatus == "" {
			taskStatus = domaintask.StatusTodo
		}
		// Resolve the task's parent indicator. IndicatorIndex points at one
		// of the inline indicators in this same payload (created together
		// in the transaction); IndicatorID points at an indicator already
		// on the server. They are mutually exclusive — if both are set we
		// reject with InvalidReference. Either is optional; absence means
		// the task lives at the mission level.
		var indicatorID *uuid.UUID
		switch {
		case tk.IndicatorIndex != nil && tk.IndicatorID != nil:
			return nil, domaintask.ErrInvalidReference
		case tk.IndicatorIndex != nil:
			idx := *tk.IndicatorIndex
			if idx < 0 || idx >= len(indicators) {
				return nil, domaintask.ErrInvalidReference
			}
			id := indicators[idx].ID
			indicatorID = &id
		case tk.IndicatorID != nil:
			indicatorID = tk.IndicatorID
		}
		t := &domaintask.Task{
			ID:             uuid.New(),
			OrganizationID: orgID,
			MissionID:      m.ID,
			IndicatorID:    indicatorID,
			AssigneeID:     assignee,
			Title:          tk.Title,
			Description:    tk.Description,
			Status:         taskStatus,
			DueDate:        tk.DueDate,
		}
		if err := t.Validate(); err != nil {
			return nil, err
		}
		tasks = append(tasks, t)
	}

	// Fast path: no children means no transaction. Keeps the simple create
	// hot path identical to before this commit.
	if len(indicators) == 0 && len(tasks) == 0 {
		created, err := uc.missions.Create(ctx, m)
		if err != nil {
			uc.logger.WarnContext(ctx, "create mission failed", "error", err)
			return nil, err
		}
		uc.logger.InfoContext(ctx, "mission created", "mission_id", created.ID)
		return &CreateResult{Mission: created}, nil
	}

	result := &CreateResult{
		Indicators: make([]domainindicator.Indicator, 0, len(indicators)),
		Tasks:      make([]domaintask.Task, 0, len(tasks)),
	}
	err := uc.txm.WithTx(ctx, func(repos apptx.Repositories) error {
		createdMission, err := repos.Missions().Create(ctx, m)
		if err != nil {
			return err
		}
		result.Mission = createdMission

		indRepo := repos.Indicators()
		for _, ind := range indicators {
			created, err := indRepo.Create(ctx, ind)
			if err != nil {
				return err
			}
			result.Indicators = append(result.Indicators, *created)
		}

		taskRepo := repos.Tasks()
		for _, t := range tasks {
			created, err := taskRepo.Create(ctx, t)
			if err != nil {
				return err
			}
			result.Tasks = append(result.Tasks, *created)
		}
		return nil
	})
	if err != nil {
		uc.logger.WarnContext(ctx, "create mission with children failed", "error", err)
		return nil, err
	}
	uc.logger.InfoContext(ctx, "mission created with children", "mission_id", result.Mission.ID, "indicators", len(result.Indicators), "tasks", len(result.Tasks))
	return result, nil
}
