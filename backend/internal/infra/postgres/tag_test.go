package postgres

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/stretchr/testify/assert"

	"github.com/getbud-co/bud2/backend/internal/domain/tag"
	"github.com/getbud-co/bud2/backend/internal/infra/postgres/sqlc"
)

type fakeTagQuerier struct {
	createRow sqlc.CreateTagRow
	createErr error
	getRow    sqlc.GetTagByIDRow
	getErr    error
	updateRow sqlc.UpdateTagRow
	updateErr error
	deleteErr error
}

func (f *fakeTagQuerier) CreateTag(_ context.Context, _ sqlc.CreateTagParams) (sqlc.CreateTagRow, error) {
	return f.createRow, f.createErr
}

func (f *fakeTagQuerier) GetTagByID(_ context.Context, _ sqlc.GetTagByIDParams) (sqlc.GetTagByIDRow, error) {
	return f.getRow, f.getErr
}

func (f *fakeTagQuerier) GetTagByName(_ context.Context, _ sqlc.GetTagByNameParams) (sqlc.GetTagByNameRow, error) {
	return sqlc.GetTagByNameRow{}, nil
}

func (f *fakeTagQuerier) ListTags(_ context.Context, _ sqlc.ListTagsParams) ([]sqlc.ListTagsRow, error) {
	return nil, nil
}

func (f *fakeTagQuerier) CountTags(_ context.Context, _ uuid.UUID) (int64, error) {
	return 0, nil
}

func (f *fakeTagQuerier) UpdateTag(_ context.Context, _ sqlc.UpdateTagParams) (sqlc.UpdateTagRow, error) {
	return f.updateRow, f.updateErr
}

func (f *fakeTagQuerier) SoftDeleteTag(_ context.Context, _ sqlc.SoftDeleteTagParams) error {
	return f.deleteErr
}

func TestTagRepository_Create_UniqueViolation_MapsToErrNameExists(t *testing.T) {
	uniqueErr := &pgconn.PgError{Code: "23505", Message: "unique constraint"}
	repo := NewTagRepository(&fakeTagQuerier{createErr: uniqueErr})

	_, err := repo.Create(context.Background(), &tag.Tag{
		ID: uuid.New(), OrganizationID: uuid.New(),
		Name: "Engineering", Color: tag.ColorNeutral,
	})

	assert.ErrorIs(t, err, tag.ErrNameExists)
}

func TestTagRepository_Create_PropagatesQuerierError(t *testing.T) {
	queryErr := errors.New("insert failed")
	repo := NewTagRepository(&fakeTagQuerier{createErr: queryErr})

	_, err := repo.Create(context.Background(), &tag.Tag{ID: uuid.New()})

	assert.ErrorIs(t, err, queryErr)
}

func TestTagRepository_GetByID_NotFound_MapsToDomainError(t *testing.T) {
	repo := NewTagRepository(&fakeTagQuerier{getErr: pgx.ErrNoRows})

	_, err := repo.GetByID(context.Background(), uuid.New(), uuid.New())

	assert.ErrorIs(t, err, tag.ErrNotFound)
}

func TestTagRepository_GetByID_PropagatesOtherErrors(t *testing.T) {
	queryErr := errors.New("conn refused")
	repo := NewTagRepository(&fakeTagQuerier{getErr: queryErr})

	_, err := repo.GetByID(context.Background(), uuid.New(), uuid.New())

	assert.ErrorIs(t, err, queryErr)
}

func TestTagRepository_Update_NotFound_MapsToDomainError(t *testing.T) {
	repo := NewTagRepository(&fakeTagQuerier{updateErr: pgx.ErrNoRows})

	_, err := repo.Update(context.Background(), &tag.Tag{
		ID: uuid.New(), OrganizationID: uuid.New(),
		Name: "Engineering", Color: tag.ColorNeutral,
	})

	assert.ErrorIs(t, err, tag.ErrNotFound)
}

func TestTagRepository_Update_UniqueViolation_MapsToErrNameExists(t *testing.T) {
	uniqueErr := &pgconn.PgError{Code: "23505", Message: "unique constraint"}
	repo := NewTagRepository(&fakeTagQuerier{updateErr: uniqueErr})

	_, err := repo.Update(context.Background(), &tag.Tag{
		ID: uuid.New(), OrganizationID: uuid.New(),
		Name: "Engineering", Color: tag.ColorNeutral,
	})

	assert.ErrorIs(t, err, tag.ErrNameExists)
}

func TestTagRowToDomain_MapsAllFields(t *testing.T) {
	now := time.Now().UTC()
	id := uuid.New()
	orgID := uuid.New()

	got := tagRowToDomain(tagRowData{
		ID:             id,
		OrganizationID: orgID,
		Name:           "Engineering",
		Color:          string(tag.ColorOrange),
		CreatedAt:      now,
		UpdatedAt:      now,
	})

	assert.Equal(t, id, got.ID)
	assert.Equal(t, orgID, got.OrganizationID)
	assert.Equal(t, "Engineering", got.Name)
	assert.Equal(t, tag.ColorOrange, got.Color)
	assert.True(t, got.CreatedAt.Equal(now))
	assert.True(t, got.UpdatedAt.Equal(now))
}
