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

	"github.com/getbud-co/bud2/backend/internal/domain/cycle"
	"github.com/getbud-co/bud2/backend/internal/infra/postgres/sqlc"
)

type fakeCycleQuerier struct {
	createRow sqlc.CreateCycleRow
	createErr error
	getRow    sqlc.GetCycleByIDRow
	getErr    error
	updateRow sqlc.UpdateCycleRow
	updateErr error
	deleteErr error
}

func (f *fakeCycleQuerier) CreateCycle(_ context.Context, _ sqlc.CreateCycleParams) (sqlc.CreateCycleRow, error) {
	return f.createRow, f.createErr
}

func (f *fakeCycleQuerier) GetCycleByID(_ context.Context, _ sqlc.GetCycleByIDParams) (sqlc.GetCycleByIDRow, error) {
	return f.getRow, f.getErr
}

func (f *fakeCycleQuerier) GetCycleByName(_ context.Context, _ sqlc.GetCycleByNameParams) (sqlc.GetCycleByNameRow, error) {
	return sqlc.GetCycleByNameRow{}, nil
}

func (f *fakeCycleQuerier) ListCycles(_ context.Context, _ sqlc.ListCyclesParams) ([]sqlc.ListCyclesRow, error) {
	return nil, nil
}

func (f *fakeCycleQuerier) ListCyclesByStatus(_ context.Context, _ sqlc.ListCyclesByStatusParams) ([]sqlc.ListCyclesByStatusRow, error) {
	return nil, nil
}

func (f *fakeCycleQuerier) CountCycles(_ context.Context, _ uuid.UUID) (int64, error) {
	return 0, nil
}

func (f *fakeCycleQuerier) CountCyclesByStatus(_ context.Context, _ sqlc.CountCyclesByStatusParams) (int64, error) {
	return 0, nil
}

func (f *fakeCycleQuerier) UpdateCycle(_ context.Context, _ sqlc.UpdateCycleParams) (sqlc.UpdateCycleRow, error) {
	return f.updateRow, f.updateErr
}

func (f *fakeCycleQuerier) SoftDeleteCycle(_ context.Context, _ sqlc.SoftDeleteCycleParams) error {
	return f.deleteErr
}

func TestCycleRepository_Create_UniqueViolation_MapsToErrNameExists(t *testing.T) {
	uniqueErr := &pgconn.PgError{Code: "23505", Message: "unique constraint"}
	repo := NewCycleRepository(&fakeCycleQuerier{createErr: uniqueErr})

	_, err := repo.Create(context.Background(), &cycle.Cycle{
		ID: uuid.New(), OrganizationID: uuid.New(),
		Name: "Q1", Type: cycle.TypeQuarterly,
		StartDate: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		EndDate:   time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC),
		Status:    cycle.StatusActive,
	})

	assert.ErrorIs(t, err, cycle.ErrNameExists)
}

func TestCycleRepository_Create_PropagatesQuerierError(t *testing.T) {
	queryErr := errors.New("insert failed")
	repo := NewCycleRepository(&fakeCycleQuerier{createErr: queryErr})

	_, err := repo.Create(context.Background(), &cycle.Cycle{ID: uuid.New()})

	assert.ErrorIs(t, err, queryErr)
}

func TestCycleRepository_GetByID_NotFound_MapsToDomainError(t *testing.T) {
	repo := NewCycleRepository(&fakeCycleQuerier{getErr: pgx.ErrNoRows})

	_, err := repo.GetByID(context.Background(), uuid.New(), uuid.New())

	assert.ErrorIs(t, err, cycle.ErrNotFound)
}

func TestCycleRepository_GetByID_PropagatesOtherErrors(t *testing.T) {
	queryErr := errors.New("conn refused")
	repo := NewCycleRepository(&fakeCycleQuerier{getErr: queryErr})

	_, err := repo.GetByID(context.Background(), uuid.New(), uuid.New())

	assert.ErrorIs(t, err, queryErr)
}

func TestCycleRepository_Update_NotFound_MapsToDomainError(t *testing.T) {
	repo := NewCycleRepository(&fakeCycleQuerier{updateErr: pgx.ErrNoRows})

	_, err := repo.Update(context.Background(), &cycle.Cycle{
		ID: uuid.New(), Name: "Q1", Type: cycle.TypeQuarterly,
		StartDate: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		EndDate:   time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC),
		Status:    cycle.StatusActive,
	})

	assert.ErrorIs(t, err, cycle.ErrNotFound)
}

func TestCycleRepository_Update_UniqueViolation_MapsToErrNameExists(t *testing.T) {
	uniqueErr := &pgconn.PgError{Code: "23505", Message: "unique constraint"}
	repo := NewCycleRepository(&fakeCycleQuerier{updateErr: uniqueErr})

	_, err := repo.Update(context.Background(), &cycle.Cycle{
		ID: uuid.New(), Name: "Q1", Type: cycle.TypeQuarterly,
		StartDate: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		EndDate:   time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC),
		Status:    cycle.StatusActive,
	})

	assert.ErrorIs(t, err, cycle.ErrNameExists)
}

func TestCycleRowToDomain_MapsAllFields(t *testing.T) {
	now := time.Now().UTC()
	id := uuid.New()
	orgID := uuid.New()
	start := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC)
	okr := time.Date(2026, 1, 31, 0, 0, 0, 0, time.UTC)
	mid := time.Date(2026, 2, 15, 0, 0, 0, 0, time.UTC)

	got := cycleRowToDomain(cycleRowData{
		ID:                    id,
		OrganizationID:        orgID,
		Name:                  "Q1",
		Type:                  string(cycle.TypeQuarterly),
		StartDate:             pgtype.Date{Time: start, Valid: true},
		EndDate:               pgtype.Date{Time: end, Valid: true},
		Status:                string(cycle.StatusActive),
		OkrDefinitionDeadline: pgtype.Date{Time: okr, Valid: true},
		MidReviewDate:         pgtype.Date{Time: mid, Valid: true},
		CreatedAt:             now,
		UpdatedAt:             now,
	})

	assert.Equal(t, id, got.ID)
	assert.Equal(t, orgID, got.OrganizationID)
	assert.Equal(t, "Q1", got.Name)
	assert.Equal(t, cycle.TypeQuarterly, got.Type)
	assert.True(t, got.StartDate.Equal(start))
	assert.True(t, got.EndDate.Equal(end))
	assert.Equal(t, cycle.StatusActive, got.Status)
	require.NotNil(t, got.OKRDefinitionDeadline)
	assert.True(t, got.OKRDefinitionDeadline.Equal(okr))
	require.NotNil(t, got.MidReviewDate)
	assert.True(t, got.MidReviewDate.Equal(mid))
}

func TestCycleRowToDomain_NullOptionalDates_MapToNil(t *testing.T) {
	got := cycleRowToDomain(cycleRowData{
		ID:             uuid.New(),
		OrganizationID: uuid.New(),
		Name:           "Annual",
		Type:           string(cycle.TypeAnnual),
		StartDate:      pgtype.Date{Time: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC), Valid: true},
		EndDate:        pgtype.Date{Time: time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC), Valid: true},
		Status:         string(cycle.StatusPlanning),
	})

	assert.Nil(t, got.OKRDefinitionDeadline)
	assert.Nil(t, got.MidReviewDate)
}
