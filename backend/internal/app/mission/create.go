package mission

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"

	apptx "github.com/getbud-co/bud2/backend/internal/app/tx"
	"github.com/getbud-co/bud2/backend/internal/domain"
	domainindicator "github.com/getbud-co/bud2/backend/internal/domain/indicator"
	domainmission "github.com/getbud-co/bud2/backend/internal/domain/mission"
	domaintag "github.com/getbud-co/bud2/backend/internal/domain/tag"
	domaintask "github.com/getbud-co/bud2/backend/internal/domain/task"
	domainteam "github.com/getbud-co/bud2/backend/internal/domain/team"
	domainuser "github.com/getbud-co/bud2/backend/internal/domain/user"
)

// MemberInput is the intent shape for a mission member at command time.
// It carries only what the caller can express; OrganizationID, MissionID,
// and JoinedAt belong to the domain entity and are filled by the factory.
type MemberInput struct {
	UserID uuid.UUID
	Role   domainmission.MemberRole
}

// IndicatorInput is the intent shape for indicators created together with a
// mission. OwnerID defaults to the mission owner when nil. It carries fields
// that domain.Indicator does not (the default is applied by the factory) and
// is distinct from a standalone CreateIndicator command.
type IndicatorInput struct {
	OwnerID      *uuid.UUID
	Title        string
	Description  *string
	TargetValue  *float64
	CurrentValue *float64
	Unit         *string
	Status       string
	DueDate      *time.Time
}

// TaskInput is the intent shape for tasks created together with a mission.
// AssigneeID defaults to the mission owner when nil. IndicatorIndex references
// one of the inline indicators by its position in the same payload so that a
// task can be nested under an indicator being created in the same request;
// IndicatorID is used when attaching to an already-existing indicator.
// Exactly one (or neither) should be set.
type TaskInput struct {
	AssigneeID     *uuid.UUID
	IndicatorID    *uuid.UUID
	IndicatorIndex *int
	Title          string
	Description    *string
	Status         string
	DueDate        *time.Time
}

// MissionInput is the intent shape for a mission subtree node. For a root
// CreateCommand, OwnerID is required. For children, OwnerID defaults to the
// parent mission owner when nil. Children recurse: each child may carry its
// own indicators, tasks, and grandchildren; the entire subtree is persisted
// atomically with the root when nested entities are present.
type MissionInput struct {
	Title        string
	Description  *string
	OwnerID      *uuid.UUID
	TeamID       *uuid.UUID
	Status       string
	Visibility   string
	KanbanStatus string
	StartDate    time.Time
	EndDate      time.Time
	Members      []MemberInput
	TagIDs       []uuid.UUID
	Indicators   []IndicatorInput
	Tasks        []TaskInput
	Children     []MissionInput
}

type CreateCommand struct {
	OrganizationID domain.TenantID
	ParentID       *uuid.UUID
	Root           MissionInput
}

type CreateUseCase struct {
	missions domainmission.Repository
	tags     domaintag.Repository
	teams    domainteam.Repository
	users    domainuser.Repository
	txm      apptx.Manager
	logger   *slog.Logger
}

func NewCreateUseCase(
	missions domainmission.Repository,
	tags domaintag.Repository,
	teams domainteam.Repository,
	users domainuser.Repository,
	txm apptx.Manager,
	logger *slog.Logger,
) *CreateUseCase {
	return &CreateUseCase{missions: missions, tags: tags, teams: teams, users: users, txm: txm, logger: logger}
}

// builtMission is the validated, in-memory representation of a single
// mission node (with its indicators, tasks, and children) ready to be
// persisted inside a transaction. The IDs on the entities are pre-assigned
// by the domain factories so child entities can reference their parent before
// any DB round-trip.
type builtMission struct {
	mission    *domainmission.Mission
	indicators []*domainindicator.Indicator
	tasks      []*domaintask.Task
	children   []*builtMission
}

func (b *builtMission) hasNestedEntities() bool {
	return len(b.indicators) > 0 || len(b.tasks) > 0 || len(b.children) > 0
}

func (b *builtMission) requiresTransactionalCreate() bool {
	return b.hasNestedEntities() || len(b.mission.Members) > 0 || len(b.mission.TagIDs) > 0
}

func (uc *CreateUseCase) Execute(ctx context.Context, cmd CreateCommand) (*domainmission.Mission, error) {
	uc.logger.DebugContext(ctx, "create mission", "org_id", cmd.OrganizationID, "title", cmd.Root.Title, "indicators", len(cmd.Root.Indicators), "tasks", len(cmd.Root.Tasks), "children", len(cmd.Root.Children))
	orgID := cmd.OrganizationID.UUID()

	if cmd.ParentID != nil {
		if _, err := uc.missions.GetByID(ctx, *cmd.ParentID, orgID); err != nil {
			if errors.Is(err, domainmission.ErrNotFound) {
				return nil, domainmission.ErrInvalidParent
			}
			return nil, err
		}
	}

	builder := newCreateTreeBuilder(uc, orgID)
	root, err := builder.build(ctx, cmd.Root, nil, cmd.ParentID, nil)
	if err != nil {
		return nil, err
	}

	// Fast path: a single mission with no relations skips the transaction
	// manager. Members and tags still require a transaction because the
	// repository syncs them through separate writes.
	if !root.requiresTransactionalCreate() {
		created, err := uc.missions.Create(ctx, root.mission)
		if err != nil {
			uc.logger.WarnContext(ctx, "create mission failed", "error", err)
			return nil, err
		}
		uc.logger.InfoContext(ctx, "mission created", "mission_id", created.ID)
		return created, nil
	}

	var rootMission *domainmission.Mission
	err = uc.txm.WithTx(ctx, func(repos apptx.Repositories) error {
		m, err := persistSubtree(ctx, repos, root)
		if err != nil {
			return err
		}
		rootMission = m
		return nil
	})
	if err != nil {
		uc.logger.WarnContext(ctx, "create mission with children failed", "error", err)
		return nil, err
	}
	uc.logger.InfoContext(ctx, "mission created with children", "mission_id", rootMission.ID)
	return rootMission, nil
}

type referenceCache struct {
	users map[uuid.UUID]struct{}
	teams map[uuid.UUID]struct{}
	tags  map[uuid.UUID]struct{}
}

func newReferenceCache() referenceCache {
	return referenceCache{
		users: map[uuid.UUID]struct{}{},
		teams: map[uuid.UUID]struct{}{},
		tags:  map[uuid.UUID]struct{}{},
	}
}

type createTreeBuilder struct {
	uc    *CreateUseCase
	orgID uuid.UUID
	cache referenceCache
}

func newCreateTreeBuilder(uc *CreateUseCase, orgID uuid.UUID) createTreeBuilder {
	return createTreeBuilder{uc: uc, orgID: orgID, cache: newReferenceCache()}
}

// build validates references for `in` and recurses for its children.
// Domain factories are invoked to produce always-valid entities with
// pre-assigned IDs so they can be persisted later in a single transaction.
//
// parentMissionID is the id of the enclosing mission (nil for the root).
// inheritedOwnerID is the owner that defaults apply to when in.OwnerID is nil.
// It is nil only for the root, where OwnerID is required.
func (b *createTreeBuilder) build(
	ctx context.Context,
	in MissionInput,
	parentMissionID *uuid.UUID,
	rootParentID *uuid.UUID,
	inheritedOwnerID *uuid.UUID,
) (*builtMission, error) {
	ownerID, err := resolveMissionOwner(in, inheritedOwnerID)
	if err != nil {
		return nil, err
	}
	if err := b.validateMissionReferences(ctx, in, ownerID); err != nil {
		return nil, err
	}
	members, err := b.buildMembers(ctx, in.Members)
	if err != nil {
		return nil, err
	}
	m, err := buildMission(b.orgID, ownerID, in, parentMissionID, rootParentID, members, in.TagIDs)
	if err != nil {
		return nil, err
	}

	indicators, err := buildIndicators(b.orgID, m.ID, ownerID, in.Indicators)
	if err != nil {
		return nil, err
	}
	tasks, err := buildTasks(b.orgID, m.ID, ownerID, in.Tasks, indicators)
	if err != nil {
		return nil, err
	}

	built := &builtMission{mission: m, indicators: indicators, tasks: tasks}
	for _, c := range in.Children {
		child, err := b.build(ctx, c, &m.ID, nil, &ownerID)
		if err != nil {
			return nil, err
		}
		built.children = append(built.children, child)
	}
	return built, nil
}

func resolveMissionOwner(in MissionInput, inheritedOwnerID *uuid.UUID) (uuid.UUID, error) {
	if in.OwnerID != nil {
		return *in.OwnerID, nil
	}
	if inheritedOwnerID != nil {
		return *inheritedOwnerID, nil
	}
	return uuid.Nil, fmt.Errorf("%w: owner_id is required", domain.ErrValidation)
}

func (b *createTreeBuilder) validateMissionReferences(ctx context.Context, in MissionInput, ownerID uuid.UUID) error {
	if err := b.ensureUser(ctx, ownerID, domainmission.ErrInvalidReference); err != nil {
		return err
	}
	if in.TeamID != nil {
		if err := b.ensureTeam(ctx, *in.TeamID); err != nil {
			return err
		}
	}
	for _, tagID := range deduplicateUUIDs(in.TagIDs) {
		if err := b.ensureTag(ctx, tagID); err != nil {
			return err
		}
	}
	for _, ind := range in.Indicators {
		owner := ownerID
		if ind.OwnerID != nil {
			owner = *ind.OwnerID
		}
		if err := b.ensureUser(ctx, owner, domainindicator.ErrInvalidReference); err != nil {
			return err
		}
	}
	for _, tk := range in.Tasks {
		assignee := ownerID
		if tk.AssigneeID != nil {
			assignee = *tk.AssigneeID
		}
		if err := b.ensureUser(ctx, assignee, domaintask.ErrInvalidReference); err != nil {
			return err
		}
	}
	return nil
}

func (b *createTreeBuilder) ensureUser(ctx context.Context, userID uuid.UUID, invalidReference error) error {
	if _, ok := b.cache.users[userID]; ok {
		return nil
	}
	if _, err := b.uc.users.GetActiveMemberByID(ctx, userID, b.orgID); err != nil {
		if errors.Is(err, domainuser.ErrNotFound) {
			return invalidReference
		}
		return err
	}
	b.cache.users[userID] = struct{}{}
	return nil
}

func (b *createTreeBuilder) ensureTeam(ctx context.Context, teamID uuid.UUID) error {
	if _, ok := b.cache.teams[teamID]; ok {
		return nil
	}
	if _, err := b.uc.teams.GetByID(ctx, teamID, b.orgID); err != nil {
		if errors.Is(err, domainteam.ErrNotFound) {
			return domainmission.ErrInvalidReference
		}
		return err
	}
	b.cache.teams[teamID] = struct{}{}
	return nil
}

func (b *createTreeBuilder) ensureTag(ctx context.Context, tagID uuid.UUID) error {
	if _, ok := b.cache.tags[tagID]; ok {
		return nil
	}
	if _, err := b.uc.tags.GetByID(ctx, tagID, b.orgID); err != nil {
		if errors.Is(err, domaintag.ErrNotFound) {
			return domainmission.ErrInvalidReference
		}
		return err
	}
	b.cache.tags[tagID] = struct{}{}
	return nil
}

func (b *createTreeBuilder) buildMembers(ctx context.Context, inputs []MemberInput) ([]domainmission.Member, error) {
	seenMembers := map[uuid.UUID]struct{}{}
	members := make([]domainmission.Member, 0, len(inputs))
	for _, in := range inputs {
		if _, dup := seenMembers[in.UserID]; dup {
			continue
		}
		seenMembers[in.UserID] = struct{}{}
		if err := b.ensureUser(ctx, in.UserID, domainmission.ErrInvalidReference); err != nil {
			return nil, err
		}
		members = append(members, domainmission.Member{UserID: in.UserID, Role: in.Role})
	}
	return members, nil
}

func buildMission(
	orgID uuid.UUID,
	ownerID uuid.UUID,
	in MissionInput,
	parentMissionID *uuid.UUID,
	rootParentID *uuid.UUID,
	members []domainmission.Member,
	tagIDs []uuid.UUID,
) (*domainmission.Mission, error) {
	period, err := domain.NewTimeRange(in.StartDate, in.EndDate)
	if err != nil {
		return nil, err
	}
	opts := buildMissionOptions(in, parentMissionID, rootParentID, members, tagIDs)
	return domainmission.NewMission(orgID, ownerID, in.Title, period, opts...)
}

func buildMissionOptions(
	in MissionInput,
	parentMissionID *uuid.UUID,
	rootParentID *uuid.UUID,
	members []domainmission.Member,
	tagIDs []uuid.UUID,
) []domainmission.MissionOption {
	opts := make([]domainmission.MissionOption, 0, 8)
	if in.Description != nil {
		opts = append(opts, domainmission.WithDescription(in.Description))
	}
	if parentMissionID != nil {
		opts = append(opts, domainmission.WithParent(*parentMissionID))
	} else if rootParentID != nil {
		opts = append(opts, domainmission.WithParent(*rootParentID))
	}
	if in.TeamID != nil {
		opts = append(opts, domainmission.WithTeam(*in.TeamID))
	}
	if in.Status != "" {
		opts = append(opts, domainmission.WithStatus(domainmission.Status(in.Status)))
	}
	if in.Visibility != "" {
		opts = append(opts, domainmission.WithVisibility(domainmission.Visibility(in.Visibility)))
	}
	if in.KanbanStatus != "" {
		opts = append(opts, domainmission.WithKanbanStatus(domainmission.KanbanStatus(in.KanbanStatus)))
	}
	if len(members) > 0 {
		opts = append(opts, domainmission.WithMembers(members))
	}
	if len(tagIDs) > 0 {
		opts = append(opts, domainmission.WithTagIDs(tagIDs))
	}
	return opts
}

func buildIndicators(
	orgID uuid.UUID,
	missionID uuid.UUID,
	missionOwnerID uuid.UUID,
	inputs []IndicatorInput,
) ([]*domainindicator.Indicator, error) {
	indicators := make([]*domainindicator.Indicator, 0, len(inputs))
	for _, in := range inputs {
		ownerID := missionOwnerID
		if in.OwnerID != nil {
			ownerID = *in.OwnerID
		}
		opts := buildIndicatorOptions(in)
		entity, err := domainindicator.NewIndicator(orgID, missionID, ownerID, in.Title, opts...)
		if err != nil {
			return nil, err
		}
		indicators = append(indicators, entity)
	}
	return indicators, nil
}

func buildIndicatorOptions(in IndicatorInput) []domainindicator.IndicatorOption {
	opts := make([]domainindicator.IndicatorOption, 0, 6)
	if in.Description != nil {
		opts = append(opts, domainindicator.WithDescription(in.Description))
	}
	if in.TargetValue != nil {
		opts = append(opts, domainindicator.WithTargetValue(in.TargetValue))
	}
	if in.CurrentValue != nil {
		opts = append(opts, domainindicator.WithCurrentValue(in.CurrentValue))
	}
	if in.Unit != nil {
		opts = append(opts, domainindicator.WithUnit(in.Unit))
	}
	if in.Status != "" {
		opts = append(opts, domainindicator.WithStatus(domainindicator.Status(in.Status)))
	}
	if in.DueDate != nil {
		opts = append(opts, domainindicator.WithDueDate(in.DueDate))
	}
	return opts
}

func buildTasks(
	orgID uuid.UUID,
	missionID uuid.UUID,
	missionOwnerID uuid.UUID,
	inputs []TaskInput,
	indicators []*domainindicator.Indicator,
) ([]*domaintask.Task, error) {
	tasks := make([]*domaintask.Task, 0, len(inputs))
	for _, in := range inputs {
		assigneeID := missionOwnerID
		if in.AssigneeID != nil {
			assigneeID = *in.AssigneeID
		}
		indicatorID, err := resolveTaskIndicatorID(in, indicators)
		if err != nil {
			return nil, err
		}
		opts := buildTaskOptions(in, indicatorID)
		entity, err := domaintask.NewTask(orgID, missionID, assigneeID, in.Title, opts...)
		if err != nil {
			return nil, err
		}
		tasks = append(tasks, entity)
	}
	return tasks, nil
}

func resolveTaskIndicatorID(in TaskInput, indicators []*domainindicator.Indicator) (*uuid.UUID, error) {
	switch {
	case in.IndicatorIndex != nil && in.IndicatorID != nil:
		return nil, domaintask.ErrInvalidReference
	case in.IndicatorIndex != nil:
		idx := *in.IndicatorIndex
		if idx < 0 || idx >= len(indicators) {
			return nil, domaintask.ErrInvalidReference
		}
		id := indicators[idx].ID
		return &id, nil
	case in.IndicatorID != nil:
		return in.IndicatorID, nil
	default:
		return nil, nil
	}
}

func buildTaskOptions(in TaskInput, indicatorID *uuid.UUID) []domaintask.TaskOption {
	opts := make([]domaintask.TaskOption, 0, 4)
	if in.Description != nil {
		opts = append(opts, domaintask.WithDescription(in.Description))
	}
	if in.Status != "" {
		opts = append(opts, domaintask.WithStatus(domaintask.Status(in.Status)))
	}
	if in.DueDate != nil {
		opts = append(opts, domaintask.WithDueDate(in.DueDate))
	}
	if indicatorID != nil {
		opts = append(opts, domaintask.WithIndicator(*indicatorID))
	}
	return opts
}

// persistSubtree creates the mission, its indicators, its tasks, and
// recurses for each child. Runs inside a single transaction provided by
// the caller — partial failure rolls back the whole tree. Returns the
// created root mission only; sub-resource entities are persisted but not
// returned (the contract aligns with reads, which fetch them separately).
func persistSubtree(ctx context.Context, repos apptx.Repositories, b *builtMission) (*domainmission.Mission, error) {
	createdMission, err := repos.Missions().Create(ctx, b.mission)
	if err != nil {
		return nil, err
	}

	if len(b.indicators) > 0 {
		indRepo := repos.Indicators()
		for _, ind := range b.indicators {
			if _, err := indRepo.Create(ctx, ind); err != nil {
				return nil, err
			}
		}
	}
	if len(b.tasks) > 0 {
		taskRepo := repos.Tasks()
		for _, t := range b.tasks {
			if _, err := taskRepo.Create(ctx, t); err != nil {
				return nil, err
			}
		}
	}
	for _, child := range b.children {
		if _, err := persistSubtree(ctx, repos, child); err != nil {
			return nil, err
		}
	}
	return createdMission, nil
}
