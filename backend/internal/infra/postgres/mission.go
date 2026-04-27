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
	return missionRowToDomain(missionRowData(row)), nil
}

func (r *MissionRepository) GetByID(ctx context.Context, id, organizationID uuid.UUID) (*mission.Mission, error) {
	row, err := r.q.GetMissionByID(ctx, sqlc.GetMissionByIDParams{ID: id, OrganizationID: organizationID})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, mission.ErrNotFound
		}
		return nil, err
	}
	return missionRowToDomain(missionRowData(row)), nil
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
	return missionRowToDomain(missionRowData(row)), nil
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

// pgtype helpers live in helpers.go (shared across repositories).
