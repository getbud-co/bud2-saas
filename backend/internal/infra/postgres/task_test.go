package postgres

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/getbud-co/bud2/backend/internal/domain/task"
	"github.com/getbud-co/bud2/backend/internal/infra/postgres/sqlc"
)

type fakeTaskQuerier struct {
	createRow sqlc.CreateTaskRow
	createErr error
	getRow    sqlc.GetTaskByIDRow
	getErr    error
	updateRow sqlc.UpdateTaskRow
	updateErr error
}

func (f *fakeTaskQuerier) CreateTask(_ context.Context, _ sqlc.CreateTaskParams) (sqlc.CreateTaskRow, error) {
	return f.createRow, f.createErr
}

func (f *fakeTaskQuerier) GetTaskByID(_ context.Context, _ sqlc.GetTaskByIDParams) (sqlc.GetTaskByIDRow, error) {
	return f.getRow, f.getErr
}

func (f *fakeTaskQuerier) ListTasks(_ context.Context, _ sqlc.ListTasksParams) ([]sqlc.ListTasksRow, error) {
	return nil, nil
}

func (f *fakeTaskQuerier) CountTasks(_ context.Context, _ sqlc.CountTasksParams) (int64, error) {
	return 0, nil
}

func (f *fakeTaskQuerier) UpdateTask(_ context.Context, _ sqlc.UpdateTaskParams) (sqlc.UpdateTaskRow, error) {
	return f.updateRow, f.updateErr
}

func (f *fakeTaskQuerier) SoftDeleteTask(_ context.Context, _ sqlc.SoftDeleteTaskParams) (int64, error) {
	return 0, nil
}

func TestTaskRepository_Create_FKViolation_MapsToInvalidReference(t *testing.T) {
	fkErr := &pgconn.PgError{Code: "23503", Message: "foreign key violation"}
	repo := NewTaskRepository(&fakeTaskQuerier{createErr: fkErr})

	_, err := repo.Create(context.Background(), &task.Task{
		ID: uuid.New(), OrganizationID: uuid.New(), MissionID: uuid.New(),
		AssigneeID: uuid.New(), Title: "Fix bug", Status: task.StatusTodo,
	})

	assert.ErrorIs(t, err, task.ErrInvalidReference)
}

func TestTaskRepository_Create_PropagatesQuerierError(t *testing.T) {
	queryErr := errors.New("insert failed")
	repo := NewTaskRepository(&fakeTaskQuerier{createErr: queryErr})

	_, err := repo.Create(context.Background(), &task.Task{ID: uuid.New(), Title: "x"})

	assert.ErrorIs(t, err, queryErr)
}

func TestTaskRepository_GetByID_NotFound_MapsToDomainError(t *testing.T) {
	repo := NewTaskRepository(&fakeTaskQuerier{getErr: pgx.ErrNoRows})

	_, err := repo.GetByID(context.Background(), uuid.New(), uuid.New())

	assert.ErrorIs(t, err, task.ErrNotFound)
}

func TestTaskRepository_GetByID_PropagatesOtherErrors(t *testing.T) {
	queryErr := errors.New("conn refused")
	repo := NewTaskRepository(&fakeTaskQuerier{getErr: queryErr})

	_, err := repo.GetByID(context.Background(), uuid.New(), uuid.New())

	assert.ErrorIs(t, err, queryErr)
}

func TestTaskRepository_Update_NotFound_MapsToDomainError(t *testing.T) {
	repo := NewTaskRepository(&fakeTaskQuerier{updateErr: pgx.ErrNoRows})

	_, err := repo.Update(context.Background(), &task.Task{ID: uuid.New(), Title: "x"})

	assert.ErrorIs(t, err, task.ErrNotFound)
}

func TestTaskRepository_Update_FKViolation_MapsToInvalidReference(t *testing.T) {
	fkErr := &pgconn.PgError{Code: "23503", Message: "foreign key violation"}
	repo := NewTaskRepository(&fakeTaskQuerier{updateErr: fkErr})

	_, err := repo.Update(context.Background(), &task.Task{ID: uuid.New(), Title: "x"})

	assert.ErrorIs(t, err, task.ErrInvalidReference)
}

func TestTaskRowToDomain_MapsAllFields(t *testing.T) {
	now := time.Now().UTC()
	id := uuid.New()
	orgID := uuid.New()
	missionID := uuid.New()
	indicatorID := uuid.New()
	assigneeID := uuid.New()
	due := time.Date(2026, 6, 30, 0, 0, 0, 0, time.UTC)
	completed := time.Date(2026, 6, 28, 12, 0, 0, 0, time.UTC)

	got := taskRowToDomain(taskRowData{
		ID:             id,
		OrganizationID: orgID,
		MissionID:      missionID,
		IndicatorID:    pgtype.UUID{Bytes: indicatorID, Valid: true},
		AssigneeID:     assigneeID,
		Title:          "Fix bug",
		Description:    pgtype.Text{String: "triage first", Valid: true},
		Status:         string(task.StatusDone),
		DueDate:        pgtype.Date{Time: due, Valid: true},
		CompletedAt:    pgtype.Timestamptz{Time: completed, Valid: true},
		CreatedAt:      now,
		UpdatedAt:      now,
	})

	assert.Equal(t, id, got.ID)
	assert.Equal(t, orgID, got.OrganizationID)
	assert.Equal(t, missionID, got.MissionID)
	require.NotNil(t, got.IndicatorID)
	assert.Equal(t, indicatorID, *got.IndicatorID)
	assert.Equal(t, assigneeID, got.AssigneeID)
	assert.Equal(t, "Fix bug", got.Title)
	require.NotNil(t, got.Description)
	assert.Equal(t, "triage first", *got.Description)
	assert.Equal(t, task.StatusDone, got.Status)
	require.NotNil(t, got.DueDate)
	assert.True(t, got.DueDate.Equal(due))
	require.NotNil(t, got.CompletedAt)
	assert.Equal(t, completed, *got.CompletedAt)
}

func TestTaskRowToDomain_NullNullableFields_MapToNil(t *testing.T) {
	got := taskRowToDomain(taskRowData{
		ID:             uuid.New(),
		OrganizationID: uuid.New(),
		MissionID:      uuid.New(),
		AssigneeID:     uuid.New(),
		Title:          "Standalone",
		Status:         string(task.StatusTodo),
	})

	assert.Nil(t, got.IndicatorID)
	assert.Nil(t, got.Description)
	assert.Nil(t, got.DueDate)
	assert.Nil(t, got.CompletedAt)
}
