package postgres

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	domaincheckin "github.com/getbud-co/bud2/backend/internal/domain/checkin"
	"github.com/getbud-co/bud2/backend/internal/infra/postgres/sqlc"
)

type fakeCheckInQuerier struct {
	createRow sqlc.CreateCheckInRow
	createErr error
	getRow    sqlc.GetCheckInByIDRow
	getErr    error
	listRows  []sqlc.ListCheckInsByIndicatorRow
	listErr   error
	countVal  int64
	countErr  error
	updateRow sqlc.UpdateCheckInRow
	updateErr error
	deleteErr error
}

func (f *fakeCheckInQuerier) CreateCheckIn(_ context.Context, _ sqlc.CreateCheckInParams) (sqlc.CreateCheckInRow, error) {
	return f.createRow, f.createErr
}
func (f *fakeCheckInQuerier) GetCheckInByID(_ context.Context, _ sqlc.GetCheckInByIDParams) (sqlc.GetCheckInByIDRow, error) {
	return f.getRow, f.getErr
}
func (f *fakeCheckInQuerier) ListCheckInsByIndicator(_ context.Context, _ sqlc.ListCheckInsByIndicatorParams) ([]sqlc.ListCheckInsByIndicatorRow, error) {
	return f.listRows, f.listErr
}
func (f *fakeCheckInQuerier) CountCheckInsByIndicator(_ context.Context, _ sqlc.CountCheckInsByIndicatorParams) (int64, error) {
	return f.countVal, f.countErr
}
func (f *fakeCheckInQuerier) UpdateCheckIn(_ context.Context, _ sqlc.UpdateCheckInParams) (sqlc.UpdateCheckInRow, error) {
	return f.updateRow, f.updateErr
}
func (f *fakeCheckInQuerier) SoftDeleteCheckIn(_ context.Context, _ sqlc.SoftDeleteCheckInParams) error {
	return f.deleteErr
}

func TestCheckInRepository_Create_PropagatesQuerierError(t *testing.T) {
	repoErr := errors.New("db error")
	repo := NewCheckInRepository(&fakeCheckInQuerier{createErr: repoErr})

	_, err := repo.Create(context.Background(), &domaincheckin.CheckIn{
		ID:          uuid.New(),
		OrgID:       uuid.New(),
		IndicatorID: uuid.New(),
		AuthorID:    uuid.New(),
		Value:       "75",
		Confidence:  domaincheckin.ConfidenceHigh,
		Mentions:    []string{},
	})

	assert.ErrorIs(t, err, repoErr)
}

func TestCheckInRepository_GetByID_NotFound_MapsToDomainError(t *testing.T) {
	repo := NewCheckInRepository(&fakeCheckInQuerier{getErr: pgx.ErrNoRows})

	_, err := repo.GetByID(context.Background(), uuid.New(), uuid.New())

	assert.ErrorIs(t, err, domaincheckin.ErrNotFound)
}

func TestCheckInRepository_GetByID_PropagatesOtherErrors(t *testing.T) {
	repoErr := errors.New("connection lost")
	repo := NewCheckInRepository(&fakeCheckInQuerier{getErr: repoErr})

	_, err := repo.GetByID(context.Background(), uuid.New(), uuid.New())

	assert.ErrorIs(t, err, repoErr)
}

func TestCheckInRepository_Update_NotFound_MapsToDomainError(t *testing.T) {
	repo := NewCheckInRepository(&fakeCheckInQuerier{updateErr: pgx.ErrNoRows})

	_, err := repo.Update(context.Background(), &domaincheckin.CheckIn{
		ID:         uuid.New(),
		OrgID:      uuid.New(),
		Value:      "80",
		Confidence: domaincheckin.ConfidenceHigh,
		Mentions:   []string{},
	})

	assert.ErrorIs(t, err, domaincheckin.ErrNotFound)
}

func TestCheckInRowToDomain_MapsAllFields(t *testing.T) {
	id := uuid.New()
	orgID := uuid.New()
	indID := uuid.New()
	authorID := uuid.New()
	prev := "40"
	note := "good progress"
	now := time.Now().Truncate(time.Second)

	row := sqlc.CreateCheckInRow{
		ID:            id,
		OrgID:         orgID,
		IndicatorID:   indID,
		AuthorID:      authorID,
		Value:         "75",
		PreviousValue: strToPgtypeText(&prev),
		Confidence:    "high",
		Note:          strToPgtypeText(&note),
		Mentions:      []string{"@alice"},
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	repo := NewCheckInRepository(&fakeCheckInQuerier{createRow: row})
	got, err := repo.Create(context.Background(), &domaincheckin.CheckIn{
		ID:          id,
		OrgID:       orgID,
		IndicatorID: indID,
		AuthorID:    authorID,
		Value:       "75",
		Confidence:  domaincheckin.ConfidenceHigh,
		Mentions:    []string{"@alice"},
	})

	require.NoError(t, err)
	assert.Equal(t, id, got.ID)
	assert.Equal(t, "75", got.Value)
	assert.Equal(t, domaincheckin.ConfidenceHigh, got.Confidence)
	require.NotNil(t, got.PreviousValue)
	assert.Equal(t, "40", *got.PreviousValue)
	require.NotNil(t, got.Note)
	assert.Equal(t, "good progress", *got.Note)
}

func TestCheckInListRowToDomain_PopulatesAuthorName(t *testing.T) {
	row := sqlc.ListCheckInsByIndicatorRow{
		ID:              uuid.New(),
		OrgID:           uuid.New(),
		IndicatorID:     uuid.New(),
		AuthorID:        uuid.New(),
		Value:           "60",
		Confidence:      "medium",
		Mentions:        []string{},
		AuthorFirstName: "João",
		AuthorLastName:  "Silva",
		PreviousValue:   pgtype.Text{},
		Note:            pgtype.Text{},
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	got := checkInListRowToDomain(row)

	require.NotNil(t, got.AuthorName)
	assert.Equal(t, "João", got.AuthorName.FirstName)
	assert.Equal(t, "Silva", got.AuthorName.LastName)
}
