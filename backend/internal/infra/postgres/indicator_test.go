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

	"github.com/getbud-co/bud2/backend/internal/domain/indicator"
	"github.com/getbud-co/bud2/backend/internal/infra/postgres/sqlc"
)

type fakeIndicatorQuerier struct {
	createRow sqlc.CreateIndicatorRow
	createErr error
	getRow    sqlc.GetIndicatorByIDRow
	getErr    error
	updateRow sqlc.UpdateIndicatorRow
	updateErr error
}

func (f *fakeIndicatorQuerier) CreateIndicator(_ context.Context, _ sqlc.CreateIndicatorParams) (sqlc.CreateIndicatorRow, error) {
	return f.createRow, f.createErr
}

func (f *fakeIndicatorQuerier) GetIndicatorByID(_ context.Context, _ sqlc.GetIndicatorByIDParams) (sqlc.GetIndicatorByIDRow, error) {
	return f.getRow, f.getErr
}

func (f *fakeIndicatorQuerier) ListIndicators(_ context.Context, _ sqlc.ListIndicatorsParams) ([]sqlc.ListIndicatorsRow, error) {
	return nil, nil
}

func (f *fakeIndicatorQuerier) CountIndicators(_ context.Context, _ sqlc.CountIndicatorsParams) (int64, error) {
	return 0, nil
}

func (f *fakeIndicatorQuerier) UpdateIndicator(_ context.Context, _ sqlc.UpdateIndicatorParams) (sqlc.UpdateIndicatorRow, error) {
	return f.updateRow, f.updateErr
}

func (f *fakeIndicatorQuerier) SoftDeleteIndicator(_ context.Context, _ sqlc.SoftDeleteIndicatorParams) (int64, error) {
	return 0, nil
}

func TestIndicatorRepository_Create_FKViolation_MapsToInvalidReference(t *testing.T) {
	fkErr := &pgconn.PgError{Code: "23503", Message: "foreign key violation"}
	repo := NewIndicatorRepository(&fakeIndicatorQuerier{createErr: fkErr})

	_, err := repo.Create(context.Background(), &indicator.Indicator{
		ID: uuid.New(), OrganizationID: uuid.New(), MissionID: uuid.New(),
		OwnerID: uuid.New(), Title: "Churn", Status: indicator.StatusDraft,
	})

	assert.ErrorIs(t, err, indicator.ErrInvalidReference)
}

func TestIndicatorRepository_Create_PropagatesQuerierError(t *testing.T) {
	queryErr := errors.New("insert failed")
	repo := NewIndicatorRepository(&fakeIndicatorQuerier{createErr: queryErr})

	_, err := repo.Create(context.Background(), &indicator.Indicator{ID: uuid.New(), Title: "x"})

	assert.ErrorIs(t, err, queryErr)
}

func TestIndicatorRepository_GetByID_NotFound_MapsToDomainError(t *testing.T) {
	repo := NewIndicatorRepository(&fakeIndicatorQuerier{getErr: pgx.ErrNoRows})

	_, err := repo.GetByID(context.Background(), uuid.New(), uuid.New())

	assert.ErrorIs(t, err, indicator.ErrNotFound)
}

func TestIndicatorRepository_GetByID_PropagatesOtherErrors(t *testing.T) {
	queryErr := errors.New("conn refused")
	repo := NewIndicatorRepository(&fakeIndicatorQuerier{getErr: queryErr})

	_, err := repo.GetByID(context.Background(), uuid.New(), uuid.New())

	assert.ErrorIs(t, err, queryErr)
}

func TestIndicatorRepository_Update_NotFound_MapsToDomainError(t *testing.T) {
	repo := NewIndicatorRepository(&fakeIndicatorQuerier{updateErr: pgx.ErrNoRows})

	_, err := repo.Update(context.Background(), &indicator.Indicator{ID: uuid.New(), Title: "x"})

	assert.ErrorIs(t, err, indicator.ErrNotFound)
}

func TestIndicatorRepository_Update_FKViolation_MapsToInvalidReference(t *testing.T) {
	fkErr := &pgconn.PgError{Code: "23503", Message: "foreign key violation"}
	repo := NewIndicatorRepository(&fakeIndicatorQuerier{updateErr: fkErr})

	_, err := repo.Update(context.Background(), &indicator.Indicator{ID: uuid.New(), Title: "x"})

	assert.ErrorIs(t, err, indicator.ErrInvalidReference)
}

func TestIndicatorRowToDomain_MapsAllFields(t *testing.T) {
	now := time.Now().UTC()
	id := uuid.New()
	orgID := uuid.New()
	missionID := uuid.New()
	ownerID := uuid.New()
	due := time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC)

	target := float64PtrToPgtypeNumeric(ptr(100.5))
	current := float64PtrToPgtypeNumeric(ptr(50.0))

	got := indicatorRowToDomain(indicatorRowData{
		ID:             id,
		OrganizationID: orgID,
		MissionID:      missionID,
		OwnerID:        ownerID,
		Title:          "Churn Rate",
		Description:    pgtype.Text{String: "reduce it", Valid: true},
		TargetValue:    target,
		CurrentValue:   current,
		Unit:           pgtype.Text{String: "%", Valid: true},
		Status:         string(indicator.StatusActive),
		DueDate:        pgtype.Date{Time: due, Valid: true},
		CreatedAt:      now,
		UpdatedAt:      now,
	})

	assert.Equal(t, id, got.ID)
	assert.Equal(t, orgID, got.OrganizationID)
	assert.Equal(t, missionID, got.MissionID)
	assert.Equal(t, ownerID, got.OwnerID)
	assert.Equal(t, "Churn Rate", got.Title)
	require.NotNil(t, got.Description)
	assert.Equal(t, "reduce it", *got.Description)
	require.NotNil(t, got.TargetValue)
	assert.InDelta(t, 100.5, *got.TargetValue, 0.001)
	require.NotNil(t, got.CurrentValue)
	assert.InDelta(t, 50.0, *got.CurrentValue, 0.001)
	require.NotNil(t, got.Unit)
	assert.Equal(t, "%", *got.Unit)
	assert.Equal(t, indicator.StatusActive, got.Status)
	require.NotNil(t, got.DueDate)
	assert.True(t, got.DueDate.Equal(due))
}

func TestIndicatorRowToDomain_NullOptionals_MapToNil(t *testing.T) {
	got := indicatorRowToDomain(indicatorRowData{
		ID:             uuid.New(),
		OrganizationID: uuid.New(),
		MissionID:      uuid.New(),
		OwnerID:        uuid.New(),
		Title:          "KPI",
		Status:         string(indicator.StatusDraft),
	})

	assert.Nil(t, got.Description)
	assert.Nil(t, got.TargetValue)
	assert.Nil(t, got.CurrentValue)
	assert.Nil(t, got.Unit)
	assert.Nil(t, got.DueDate)
}

func TestFloat64PtrToPgtypeNumeric_RoundTrip(t *testing.T) {
	v := 42.5
	n := float64PtrToPgtypeNumeric(&v)
	assert.True(t, n.Valid)

	got := pgtypeNumericToFloat64Ptr(n)
	require.NotNil(t, got)
	assert.InDelta(t, 42.5, *got, 0.001)
}

func TestFloat64PtrToPgtypeNumeric_Nil_ReturnsInvalid(t *testing.T) {
	n := float64PtrToPgtypeNumeric(nil)
	assert.False(t, n.Valid)
}

func TestPgtypeNumericToFloat64Ptr_Invalid_ReturnsNil(t *testing.T) {
	assert.Nil(t, pgtypeNumericToFloat64Ptr(pgtype.Numeric{Valid: false}))
}

func ptr(v float64) *float64 { return &v }
