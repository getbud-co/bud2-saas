package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/getbud-co/bud2/backend/internal/domain/task"
	"github.com/getbud-co/bud2/backend/internal/infra/postgres/sqlc"
)

type taskQuerier interface {
	CreateTask(ctx context.Context, arg sqlc.CreateTaskParams) (sqlc.CreateTaskRow, error)
	GetTaskByID(ctx context.Context, arg sqlc.GetTaskByIDParams) (sqlc.GetTaskByIDRow, error)
	ListTasks(ctx context.Context, arg sqlc.ListTasksParams) ([]sqlc.ListTasksRow, error)
	CountTasks(ctx context.Context, arg sqlc.CountTasksParams) (int64, error)
	UpdateTask(ctx context.Context, arg sqlc.UpdateTaskParams) (sqlc.UpdateTaskRow, error)
	SoftDeleteTask(ctx context.Context, arg sqlc.SoftDeleteTaskParams) (int64, error)
}

type TaskRepository struct {
	q taskQuerier
}

func NewTaskRepository(q taskQuerier) *TaskRepository {
	return &TaskRepository{q: q}
}

func (r *TaskRepository) Create(ctx context.Context, t *task.Task) (*task.Task, error) {
	row, err := r.q.CreateTask(ctx, sqlc.CreateTaskParams{
		ID:             t.ID,
		OrganizationID: t.OrganizationID,
		MissionID:      t.MissionID,
		IndicatorID:    uuidPtrToPgtype(t.IndicatorID),
		AssigneeID:     t.AssigneeID,
		Title:          t.Title,
		Description:    textToPgtype(t.Description),
		Status:         string(t.Status),
		DueDate:        timeToPgtypeDate(t.DueDate),
		CompletedAt:    timeToPgtypeTimestamptz(t.CompletedAt),
	})
	if err != nil {
		if isFKViolation(err) {
			return nil, task.ErrInvalidReference
		}
		return nil, err
	}
	return taskRowToDomain(taskRowData(row)), nil
}

func (r *TaskRepository) GetByID(ctx context.Context, id, organizationID uuid.UUID) (*task.Task, error) {
	row, err := r.q.GetTaskByID(ctx, sqlc.GetTaskByIDParams{ID: id, OrganizationID: organizationID})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, task.ErrNotFound
		}
		return nil, err
	}
	return taskRowToDomain(taskRowData(row)), nil
}

func (r *TaskRepository) List(ctx context.Context, f task.ListFilter) (task.ListResult, error) {
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

	listParams := sqlc.ListTasksParams{
		OrganizationID: f.OrganizationID,
		Limit:          limit,
		Offset:         offset,
		MissionID:      uuidPtrToPgtype(f.MissionID),
		IndicatorID:    uuidPtrToPgtype(f.IndicatorID),
		AssigneeID:     uuidPtrToPgtype(f.AssigneeID),
		Status:         statusParam,
	}

	rows, err := r.q.ListTasks(ctx, listParams)
	if err != nil {
		return task.ListResult{}, err
	}
	total, err := r.q.CountTasks(ctx, sqlc.CountTasksParams{
		OrganizationID: f.OrganizationID,
		MissionID:      listParams.MissionID,
		IndicatorID:    listParams.IndicatorID,
		AssigneeID:     listParams.AssigneeID,
		Status:         listParams.Status,
	})
	if err != nil {
		return task.ListResult{}, err
	}

	tasks := make([]task.Task, 0, len(rows))
	for _, row := range rows {
		tasks = append(tasks, *taskRowToDomain(taskRowData(row)))
	}
	return task.ListResult{Tasks: tasks, Total: total}, nil
}

func (r *TaskRepository) Update(ctx context.Context, t *task.Task) (*task.Task, error) {
	row, err := r.q.UpdateTask(ctx, sqlc.UpdateTaskParams{
		ID:             t.ID,
		OrganizationID: t.OrganizationID,
		Title:          t.Title,
		Description:    textToPgtype(t.Description),
		IndicatorID:    uuidPtrToPgtype(t.IndicatorID),
		AssigneeID:     t.AssigneeID,
		Status:         string(t.Status),
		DueDate:        timeToPgtypeDate(t.DueDate),
		CompletedAt:    timeToPgtypeTimestamptz(t.CompletedAt),
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, task.ErrNotFound
		}
		if isFKViolation(err) {
			return nil, task.ErrInvalidReference
		}
		return nil, err
	}
	return taskRowToDomain(taskRowData(row)), nil
}

func (r *TaskRepository) SoftDelete(ctx context.Context, id, organizationID uuid.UUID) error {
	_, err := r.q.SoftDeleteTask(ctx, sqlc.SoftDeleteTaskParams{ID: id, OrganizationID: organizationID})
	return err
}

// ── helpers ────────────────────────────────────────────────────────────────

type taskRowData struct {
	ID             uuid.UUID
	OrganizationID uuid.UUID
	MissionID      uuid.UUID
	IndicatorID    pgtype.UUID
	AssigneeID     uuid.UUID
	Title          string
	Description    pgtype.Text
	Status         string
	DueDate        pgtype.Date
	CompletedAt    pgtype.Timestamptz
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

func taskRowToDomain(row taskRowData) *task.Task {
	return &task.Task{
		ID:             row.ID,
		OrganizationID: row.OrganizationID,
		MissionID:      row.MissionID,
		IndicatorID:    pgtypeToUUIDPtr(row.IndicatorID),
		AssigneeID:     row.AssigneeID,
		Title:          row.Title,
		Description:    pgtypeToText(row.Description),
		Status:         task.Status(row.Status),
		DueDate:        pgtypeDateToTime(row.DueDate),
		CompletedAt:    pgtypeTimestamptzToTime(row.CompletedAt),
		CreatedAt:      row.CreatedAt,
		UpdatedAt:      row.UpdatedAt,
	}
}
