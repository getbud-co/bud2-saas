package postgres

import (
	"context"
	_ "embed"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/getbud-co/bud2/backend/internal/domain/mission"
	"github.com/getbud-co/bud2/backend/internal/infra/postgres/sqlc"
)

//go:embed sql/soft_delete_mission_subtree.sql
var softDeleteMissionSubtreeSQL string

type missionQuerier interface {
	CreateMission(ctx context.Context, arg sqlc.CreateMissionParams) (sqlc.CreateMissionRow, error)
	GetMissionByID(ctx context.Context, arg sqlc.GetMissionByIDParams) (sqlc.GetMissionByIDRow, error)
	ListMissions(ctx context.Context, arg sqlc.ListMissionsParams) ([]sqlc.ListMissionsRow, error)
	CountMissions(ctx context.Context, arg sqlc.CountMissionsParams) (int64, error)
	UpdateMission(ctx context.Context, arg sqlc.UpdateMissionParams) (sqlc.UpdateMissionRow, error)
	ListMissionMembers(ctx context.Context, arg sqlc.ListMissionMembersParams) ([]sqlc.MissionMember, error)
	DeleteMissionMembers(ctx context.Context, arg sqlc.DeleteMissionMembersParams) error
	DeleteMissionMemberByUser(ctx context.Context, arg sqlc.DeleteMissionMemberByUserParams) error
	InsertMissionMember(ctx context.Context, arg sqlc.InsertMissionMemberParams) error
	ListMissionTagIDs(ctx context.Context, arg sqlc.ListMissionTagIDsParams) ([]uuid.UUID, error)
	InsertMissionTag(ctx context.Context, arg sqlc.InsertMissionTagParams) error
	DeleteMissionTagByTag(ctx context.Context, arg sqlc.DeleteMissionTagByTagParams) error
	DeleteMissionTags(ctx context.Context, arg sqlc.DeleteMissionTagsParams) error
}

type MissionRepository struct {
	q  missionQuerier
	db sqlc.DBTX
}

func NewMissionRepository(q missionQuerier, db sqlc.DBTX) *MissionRepository {
	return &MissionRepository{q: q, db: db}
}

func (r *MissionRepository) Create(ctx context.Context, m *mission.Mission) (*mission.Mission, error) {
	row, err := r.q.CreateMission(ctx, sqlc.CreateMissionParams{
		ID:             m.ID,
		OrganizationID: m.OrganizationID,
		ParentID:       uuidPtrToPgtype(m.ParentID),
		OwnerID:        m.OwnerID,
		TeamID:         uuidPtrToPgtype(m.TeamID),
		Title:          m.Title,
		Description:    textToPgtype(m.Description),
		Status:         string(m.Status),
		Visibility:     string(m.Visibility),
		KanbanStatus:   string(m.KanbanStatus),
		StartDate:      pgtype.Date{Time: m.StartDate, Valid: true},
		EndDate:        pgtype.Date{Time: m.EndDate, Valid: true},
		CompletedAt:    timeToPgtypeTimestamptz(m.CompletedAt),
	})
	if err != nil {
		if isFKViolation(err) {
			return nil, mission.ErrInvalidReference
		}
		return nil, err
	}
	created := missionRowToDomain(missionRowData(row))
	created.Members = m.Members
	if err := r.syncMembers(ctx, created); err != nil {
		return nil, err
	}
	if err := r.loadMembers(ctx, created); err != nil {
		return nil, err
	}
	created.TagIDs = m.TagIDs
	if err := r.syncTagIDs(ctx, created); err != nil {
		return nil, err
	}
	if err := r.loadTagIDs(ctx, created); err != nil {
		return nil, err
	}
	return created, nil
}

func (r *MissionRepository) GetByID(ctx context.Context, id, organizationID uuid.UUID) (*mission.Mission, error) {
	row, err := r.q.GetMissionByID(ctx, sqlc.GetMissionByIDParams{ID: id, OrganizationID: organizationID})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, mission.ErrNotFound
		}
		return nil, err
	}
	m := missionRowToDomain(missionRowData(row))
	if err := r.loadMembers(ctx, m); err != nil {
		return nil, err
	}
	if err := r.loadTagIDs(ctx, m); err != nil {
		return nil, err
	}
	return m, nil
}

func (r *MissionRepository) List(ctx context.Context, f mission.ListFilter) (mission.ListResult, error) {
	page := f.Page
	size := f.Size
	if page <= 0 {
		page = 1
	}
	if size <= 0 {
		size = 20
	}
	limit := int32(size)
	offset := int32((page - 1) * size)

	statusParam := pgtype.Text{Valid: false}
	if f.Status != nil {
		statusParam = pgtype.Text{String: string(*f.Status), Valid: true}
	}

	listParams := sqlc.ListMissionsParams{
		OrganizationID: f.OrganizationID,
		Limit:          limit,
		Offset:         offset,
		OwnerID:        uuidPtrToPgtype(f.OwnerID),
		TeamID:         uuidPtrToPgtype(f.TeamID),
		Status:         statusParam,
		FilterByParent: f.FilterByParent,
		ParentID:       uuidPtrToPgtype(f.ParentID),
	}

	rows, err := r.q.ListMissions(ctx, listParams)
	if err != nil {
		return mission.ListResult{}, err
	}
	total, err := r.q.CountMissions(ctx, sqlc.CountMissionsParams{
		OrganizationID: f.OrganizationID,
		OwnerID:        listParams.OwnerID,
		TeamID:         listParams.TeamID,
		Status:         listParams.Status,
		FilterByParent: f.FilterByParent,
		ParentID:       listParams.ParentID,
	})
	if err != nil {
		return mission.ListResult{}, err
	}

	missions := make([]mission.Mission, 0, len(rows))
	for _, row := range rows {
		missions = append(missions, *missionRowToDomain(missionRowData(row)))
	}
	for i := range missions {
		if err := r.loadMembers(ctx, &missions[i]); err != nil {
			return mission.ListResult{}, err
		}
		if err := r.loadTagIDs(ctx, &missions[i]); err != nil {
			return mission.ListResult{}, err
		}
	}
	return mission.ListResult{Missions: missions, Total: total}, nil
}

func (r *MissionRepository) Update(ctx context.Context, m *mission.Mission) (*mission.Mission, error) {
	row, err := r.q.UpdateMission(ctx, sqlc.UpdateMissionParams{
		ID:             m.ID,
		OrganizationID: m.OrganizationID,
		Title:          m.Title,
		Description:    textToPgtype(m.Description),
		ParentID:       uuidPtrToPgtype(m.ParentID),
		OwnerID:        m.OwnerID,
		TeamID:         uuidPtrToPgtype(m.TeamID),
		Status:         string(m.Status),
		Visibility:     string(m.Visibility),
		KanbanStatus:   string(m.KanbanStatus),
		StartDate:      pgtype.Date{Time: m.StartDate, Valid: true},
		EndDate:        pgtype.Date{Time: m.EndDate, Valid: true},
		CompletedAt:    timeToPgtypeTimestamptz(m.CompletedAt),
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, mission.ErrNotFound
		}
		if isFKViolation(err) {
			return nil, mission.ErrInvalidReference
		}
		return nil, err
	}
	updated := missionRowToDomain(missionRowData(row))
	updated.Members = m.Members
	if err := r.syncMembers(ctx, updated); err != nil {
		return nil, err
	}
	if err := r.loadMembers(ctx, updated); err != nil {
		return nil, err
	}
	updated.TagIDs = m.TagIDs
	if err := r.syncTagIDs(ctx, updated); err != nil {
		return nil, err
	}
	if err := r.loadTagIDs(ctx, updated); err != nil {
		return nil, err
	}
	return updated, nil
}

func (r *MissionRepository) SoftDeleteSubtree(ctx context.Context, id, organizationID uuid.UUID) error {
	_, err := r.db.Exec(ctx, softDeleteMissionSubtreeSQL, id, organizationID)
	return err
}

// ── helpers ────────────────────────────────────────────────────────────────

type missionRowData struct {
	ID             uuid.UUID
	OrganizationID uuid.UUID
	ParentID       pgtype.UUID
	OwnerID        uuid.UUID
	TeamID         pgtype.UUID
	Title          string
	Description    pgtype.Text
	Status         string
	Visibility     string
	KanbanStatus   string
	StartDate      pgtype.Date
	EndDate        pgtype.Date
	CompletedAt    pgtype.Timestamptz
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

func missionRowToDomain(row missionRowData) *mission.Mission {
	return &mission.Mission{
		ID:             row.ID,
		OrganizationID: row.OrganizationID,
		ParentID:       pgtypeToUUIDPtr(row.ParentID),
		OwnerID:        row.OwnerID,
		TeamID:         pgtypeToUUIDPtr(row.TeamID),
		Title:          row.Title,
		Description:    pgtypeToText(row.Description),
		Status:         mission.Status(row.Status),
		Visibility:     mission.Visibility(row.Visibility),
		KanbanStatus:   mission.KanbanStatus(row.KanbanStatus),
		StartDate:      row.StartDate.Time,
		EndDate:        row.EndDate.Time,
		CompletedAt:    pgtypeTimestamptzToTime(row.CompletedAt),
		CreatedAt:      row.CreatedAt,
		UpdatedAt:      row.UpdatedAt,
	}
}

// ── Member helpers ─────────────────────────────────────────────────────────────

func (r *MissionRepository) loadMembers(ctx context.Context, m *mission.Mission) error {
	rows, err := r.q.ListMissionMembers(ctx, sqlc.ListMissionMembersParams{
		OrgID:     m.OrganizationID,
		MissionID: m.ID,
	})
	if err != nil {
		return err
	}
	m.Members = make([]mission.Member, len(rows))
	for i, row := range rows {
		m.Members[i] = mission.Member{
			OrganizationID: row.OrgID,
			MissionID:      row.MissionID,
			UserID:         row.UserID,
			Role:           mission.MemberRole(row.Role),
			JoinedAt:       row.JoinedAt,
		}
	}
	return nil
}

func (r *MissionRepository) syncMembers(ctx context.Context, m *mission.Mission) error {
	existing, err := r.q.ListMissionMembers(ctx, sqlc.ListMissionMembersParams{
		OrgID:     m.OrganizationID,
		MissionID: m.ID,
	})
	if err != nil {
		return err
	}
	existingByUserID := make(map[uuid.UUID]sqlc.MissionMember, len(existing))
	for _, e := range existing {
		existingByUserID[e.UserID] = e
	}

	desiredUserIDs := make(map[uuid.UUID]struct{}, len(m.Members))
	for i := range m.Members {
		mem := &m.Members[i]
		desiredUserIDs[mem.UserID] = struct{}{}

		if e, found := existingByUserID[mem.UserID]; found {
			// Preserve the original joined_at.
			mem.JoinedAt = e.JoinedAt
			if e.Role != string(mem.Role) {
				// Role changed: delete and re-insert to update role.
				if err := r.q.DeleteMissionMemberByUser(ctx, sqlc.DeleteMissionMemberByUserParams{
					OrgID:     m.OrganizationID,
					MissionID: m.ID,
					UserID:    mem.UserID,
				}); err != nil {
					return err
				}
				if err := r.q.InsertMissionMember(ctx, sqlc.InsertMissionMemberParams{
					OrgID:     m.OrganizationID,
					MissionID: m.ID,
					UserID:    mem.UserID,
					Role:      string(mem.Role),
					JoinedAt:  mem.JoinedAt,
				}); err != nil {
					return err
				}
			}
		} else {
			if err := r.q.InsertMissionMember(ctx, sqlc.InsertMissionMemberParams{
				OrgID:     m.OrganizationID,
				MissionID: m.ID,
				UserID:    mem.UserID,
				Role:      string(mem.Role),
				JoinedAt:  mem.JoinedAt,
			}); err != nil {
				return err
			}
		}
	}

	for userID := range existingByUserID {
		if _, keep := desiredUserIDs[userID]; !keep {
			if err := r.q.DeleteMissionMemberByUser(ctx, sqlc.DeleteMissionMemberByUserParams{
				OrgID:     m.OrganizationID,
				MissionID: m.ID,
				UserID:    userID,
			}); err != nil {
				return err
			}
		}
	}

	return nil
}

// ── Tag helpers ────────────────────────────────────────────────────────────────

func (r *MissionRepository) loadTagIDs(ctx context.Context, m *mission.Mission) error {
	ids, err := r.q.ListMissionTagIDs(ctx, sqlc.ListMissionTagIDsParams{
		OrgID:     m.OrganizationID,
		MissionID: m.ID,
	})
	if err != nil {
		return err
	}
	if ids == nil {
		ids = []uuid.UUID{}
	}
	m.TagIDs = ids
	return nil
}

func (r *MissionRepository) syncTagIDs(ctx context.Context, m *mission.Mission) error {
	existing, err := r.q.ListMissionTagIDs(ctx, sqlc.ListMissionTagIDsParams{
		OrgID:     m.OrganizationID,
		MissionID: m.ID,
	})
	if err != nil {
		return err
	}

	existingSet := make(map[uuid.UUID]struct{}, len(existing))
	for _, id := range existing {
		existingSet[id] = struct{}{}
	}

	desiredSet := make(map[uuid.UUID]struct{}, len(m.TagIDs))
	for _, id := range m.TagIDs {
		desiredSet[id] = struct{}{}
	}

	for id := range desiredSet {
		if _, found := existingSet[id]; !found {
			if err := r.q.InsertMissionTag(ctx, sqlc.InsertMissionTagParams{
				OrgID:     m.OrganizationID,
				MissionID: m.ID,
				TagID:     id,
			}); err != nil {
				return err
			}
		}
	}

	for id := range existingSet {
		if _, keep := desiredSet[id]; !keep {
			if err := r.q.DeleteMissionTagByTag(ctx, sqlc.DeleteMissionTagByTagParams{
				OrgID:     m.OrganizationID,
				MissionID: m.ID,
				TagID:     id,
			}); err != nil {
				return err
			}
		}
	}

	return nil
}

// pgtype helpers live in helpers.go (shared across repositories).
