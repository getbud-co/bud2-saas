package mission

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
)

type MemberRole string

const (
	MemberRoleOwner     MemberRole = "owner"
	MemberRoleSupporter MemberRole = "supporter"
	MemberRoleObserver  MemberRole = "observer"
)

func (r MemberRole) IsValid() bool {
	switch r {
	case MemberRoleOwner, MemberRoleSupporter, MemberRoleObserver:
		return true
	}
	return false
}

type Member struct {
	OrganizationID uuid.UUID
	MissionID      uuid.UUID
	UserID         uuid.UUID
	Role           MemberRole
	JoinedAt       time.Time
}

func (m *Member) Validate() error {
	if m.OrganizationID == uuid.Nil {
		return fmt.Errorf("%w: member organization_id is required", domain.ErrValidation)
	}
	if m.MissionID == uuid.Nil {
		return fmt.Errorf("%w: member mission_id is required", domain.ErrValidation)
	}
	if m.UserID == uuid.Nil {
		return fmt.Errorf("%w: member user_id is required", domain.ErrValidation)
	}
	if !m.Role.IsValid() {
		return fmt.Errorf("%w: member role must be one of: owner, supporter, observer", domain.ErrValidation)
	}
	return nil
}

type Status string

const (
	StatusDraft     Status = "draft"
	StatusActive    Status = "active"
	StatusPaused    Status = "paused"
	StatusCompleted Status = "completed"
	StatusCancelled Status = "cancelled"
)

func (s Status) IsValid() bool {
	switch s {
	case StatusDraft, StatusActive, StatusPaused, StatusCompleted, StatusCancelled:
		return true
	}
	return false
}

type Visibility string

const (
	VisibilityPublic   Visibility = "public"
	VisibilityTeamOnly Visibility = "team_only"
	VisibilityPrivate  Visibility = "private"
)

func (v Visibility) IsValid() bool {
	switch v {
	case VisibilityPublic, VisibilityTeamOnly, VisibilityPrivate:
		return true
	}
	return false
}

type KanbanStatus string

const (
	KanbanUncategorized KanbanStatus = "uncategorized"
	KanbanTodo          KanbanStatus = "todo"
	KanbanDoing         KanbanStatus = "doing"
	KanbanDone          KanbanStatus = "done"
)

func (k KanbanStatus) IsValid() bool {
	switch k {
	case KanbanUncategorized, KanbanTodo, KanbanDoing, KanbanDone:
		return true
	}
	return false
}

type Mission struct {
	ID             uuid.UUID
	OrganizationID uuid.UUID
	ParentID       *uuid.UUID
	OwnerID        uuid.UUID
	TeamID         *uuid.UUID
	Title          string
	Description    *string
	Status         Status
	Visibility     Visibility
	KanbanStatus   KanbanStatus
	StartDate      time.Time
	EndDate        time.Time
	CompletedAt    *time.Time
	Members        []Member
	TagIDs         []uuid.UUID
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

func (m *Mission) validateInvariants() error {
	if m.ID == uuid.Nil {
		return fmt.Errorf("%w: id is required", domain.ErrValidation)
	}
	if m.OrganizationID == uuid.Nil {
		return fmt.Errorf("%w: organization_id is required", domain.ErrValidation)
	}
	if m.OwnerID == uuid.Nil {
		return fmt.Errorf("%w: owner_id is required", domain.ErrValidation)
	}
	if m.ParentID != nil && *m.ParentID == m.ID {
		return fmt.Errorf("%w: mission cannot be its own parent", domain.ErrValidation)
	}
	if m.TeamID != nil && *m.TeamID == uuid.Nil {
		return fmt.Errorf("%w: team_id is required when provided", domain.ErrValidation)
	}
	if m.Title == "" {
		return fmt.Errorf("%w: title is required", domain.ErrValidation)
	}
	if len(m.Title) > 200 {
		return fmt.Errorf("%w: title must be at most 200 characters", domain.ErrValidation)
	}
	if m.Description != nil && len(*m.Description) > 5000 {
		return fmt.Errorf("%w: description must be at most 5000 characters", domain.ErrValidation)
	}
	if !m.Status.IsValid() {
		return fmt.Errorf("%w: status must be one of: draft, active, paused, completed, cancelled", domain.ErrValidation)
	}
	if !m.Visibility.IsValid() {
		return fmt.Errorf("%w: visibility must be one of: public, team_only, private", domain.ErrValidation)
	}
	if !m.KanbanStatus.IsValid() {
		return fmt.Errorf("%w: kanban_status must be one of: uncategorized, todo, doing, done", domain.ErrValidation)
	}
	if m.StartDate.IsZero() {
		return fmt.Errorf("%w: start_date is required", domain.ErrValidation)
	}
	if m.EndDate.IsZero() {
		return fmt.Errorf("%w: end_date is required", domain.ErrValidation)
	}
	if m.EndDate.Before(m.StartDate) {
		return fmt.Errorf("%w: end_date must be on or after start_date", domain.ErrValidation)
	}
	if m.CompletedAt != nil && m.Status != StatusCompleted {
		return fmt.Errorf("%w: completed_at is only allowed when status is 'completed'", domain.ErrValidation)
	}
	for i := range m.Members {
		if err := m.Members[i].Validate(); err != nil {
			return err
		}
	}
	return nil
}

// Validate is the public invariant check used by repositories post-load and
// by update use cases that mutate fields after construction.
// New aggregates are created via NewMission.
func (m *Mission) Validate() error {
	return m.validateInvariants()
}

func (m *Mission) Rename(title string) error {
	next := *m
	next.Title = title
	if err := next.validateInvariants(); err != nil {
		return err
	}
	m.Title = title
	return nil
}

func (m *Mission) ChangeDescription(description *string) error {
	next := *m
	next.Description = description
	if err := next.validateInvariants(); err != nil {
		return err
	}
	m.Description = description
	return nil
}

func (m *Mission) ChangeOwner(ownerID uuid.UUID) error {
	next := *m
	next.OwnerID = ownerID
	if err := next.validateInvariants(); err != nil {
		return err
	}
	m.OwnerID = ownerID
	return nil
}

func (m *Mission) AssignTeam(teamID uuid.UUID) error {
	next := *m
	next.TeamID = &teamID
	if err := next.validateInvariants(); err != nil {
		return err
	}
	m.TeamID = &teamID
	return nil
}

func (m *Mission) ChangeStatus(status Status, now time.Time) error {
	next := *m
	next.Status = status
	if status == StatusCompleted {
		if next.CompletedAt == nil {
			completedAt := now.UTC()
			next.CompletedAt = &completedAt
		}
	} else {
		next.CompletedAt = nil
	}
	if err := next.validateInvariants(); err != nil {
		return err
	}
	m.Status = next.Status
	m.CompletedAt = next.CompletedAt
	return nil
}

func (m *Mission) ChangeVisibility(visibility Visibility) error {
	next := *m
	next.Visibility = visibility
	if err := next.validateInvariants(); err != nil {
		return err
	}
	m.Visibility = visibility
	return nil
}

func (m *Mission) ChangeKanbanStatus(status KanbanStatus) error {
	next := *m
	next.KanbanStatus = status
	if err := next.validateInvariants(); err != nil {
		return err
	}
	m.KanbanStatus = status
	return nil
}

func (m *Mission) Reschedule(period domain.TimeRange) error {
	next := *m
	next.StartDate = period.Start
	next.EndDate = period.End
	if err := next.validateInvariants(); err != nil {
		return err
	}
	m.StartDate = period.Start
	m.EndDate = period.End
	return nil
}

func (m *Mission) ReplaceMembers(members []Member) error {
	normalized, err := normalizeMembers(m.OrganizationID, m.ID, members)
	if err != nil {
		return err
	}
	next := *m
	next.Members = normalized
	if err := next.validateInvariants(); err != nil {
		return err
	}
	m.Members = normalized
	return nil
}

func (m *Mission) ReplaceTagIDs(ids []uuid.UUID) error {
	deduped := deduplicateUUIDs(ids)
	next := *m
	next.TagIDs = deduped
	if err := next.validateInvariants(); err != nil {
		return err
	}
	m.TagIDs = deduped
	return nil
}

// MissionOption configures optional fields on a Mission during construction.
type MissionOption func(*Mission)

func WithDescription(d *string) MissionOption       { return func(m *Mission) { m.Description = d } }
func WithParent(id uuid.UUID) MissionOption         { return func(m *Mission) { m.ParentID = &id } }
func WithTeam(id uuid.UUID) MissionOption           { return func(m *Mission) { m.TeamID = &id } }
func WithStatus(s Status) MissionOption             { return func(m *Mission) { m.Status = s } }
func WithVisibility(v Visibility) MissionOption     { return func(m *Mission) { m.Visibility = v } }
func WithKanbanStatus(k KanbanStatus) MissionOption { return func(m *Mission) { m.KanbanStatus = k } }
func WithMembers(ms []Member) MissionOption         { return func(m *Mission) { m.Members = ms } }
func WithTagIDs(ids []uuid.UUID) MissionOption      { return func(m *Mission) { m.TagIDs = ids } }

// NewMission constructs an always-valid Mission. Generates ID, applies
// defaults (StatusDraft, VisibilityPublic, KanbanUncategorized), deduplicates
// tag IDs, propagates MissionID/OrganizationID to members, and enforces
// invariants before returning.
func NewMission(
	orgID, ownerID uuid.UUID,
	title string,
	period domain.TimeRange,
	opts ...MissionOption,
) (*Mission, error) {
	m := &Mission{
		ID:             uuid.New(),
		OrganizationID: orgID,
		OwnerID:        ownerID,
		Title:          title,
		StartDate:      period.Start,
		EndDate:        period.End,
		Status:         StatusDraft,
		Visibility:     VisibilityPublic,
		KanbanStatus:   KanbanUncategorized,
	}
	for _, opt := range opts {
		opt(m)
	}
	m.TagIDs = deduplicateUUIDs(m.TagIDs)
	members, err := normalizeMembers(m.OrganizationID, m.ID, m.Members)
	if err != nil {
		return nil, err
	}
	m.Members = members
	if err := m.validateInvariants(); err != nil {
		return nil, err
	}
	return m, nil
}

func normalizeMembers(orgID, missionID uuid.UUID, members []Member) ([]Member, error) {
	seen := make(map[uuid.UUID]struct{}, len(members))
	out := make([]Member, 0, len(members))
	for _, member := range members {
		if _, dup := seen[member.UserID]; dup {
			continue
		}
		seen[member.UserID] = struct{}{}
		member.OrganizationID = orgID
		member.MissionID = missionID
		if !member.Role.IsValid() {
			member.Role = MemberRoleSupporter
		}
		if err := member.Validate(); err != nil {
			return nil, err
		}
		out = append(out, member)
	}
	return out, nil
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

type ListFilter struct {
	OrganizationID uuid.UUID
	ParentID       *uuid.UUID
	FilterByParent bool // true = filter by ParentID (nil means root only); false = no parent filter
	Status         *Status
	OwnerID        *uuid.UUID
	TeamID         *uuid.UUID
	Page           int
	Size           int
}

type ListResult struct {
	Missions []Mission
	Total    int64
	Page     int
	Size     int
}

type Repository interface {
	Create(ctx context.Context, mission *Mission) (*Mission, error)
	GetByID(ctx context.Context, id, organizationID uuid.UUID) (*Mission, error)
	List(ctx context.Context, filter ListFilter) (ListResult, error)
	Update(ctx context.Context, mission *Mission) (*Mission, error)
	SoftDeleteSubtree(ctx context.Context, id, organizationID uuid.UUID) error
}

var (
	ErrNotFound      = errors.New("mission not found")
	ErrInvalidParent = errors.New("invalid parent mission")
	// ErrInvalidReference indicates that team_id or owner_id references a
	// resource that does not exist in the active tenant. Use case layer
	// validates this explicitly before persistence; repositories also map FK
	// violations (SQLSTATE 23503) to this error as a defense-in-depth.
	ErrInvalidReference = errors.New("invalid mission reference")
)
