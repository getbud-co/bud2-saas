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

	"github.com/getbud-co/bud2/backend/internal/domain"
	"github.com/getbud-co/bud2/backend/internal/domain/mission"
	"github.com/getbud-co/bud2/backend/internal/infra/postgres/sqlc"
)

type fakeMissionQuerier struct {
	createRow    sqlc.CreateMissionRow
	createErr    error
	createParams sqlc.CreateMissionParams
	getRow       sqlc.GetMissionByIDRow
	getErr       error
	listRows     []sqlc.ListMissionsRow
	listErr      error
	listParams   sqlc.ListMissionsParams
	countTotal   int64
	countErr     error
	countParams  sqlc.CountMissionsParams
	updateRow    sqlc.UpdateMissionRow
	updateErr    error
	updateParams sqlc.UpdateMissionParams
	// member support
	memberRows    []sqlc.MissionMember
	memberListErr error
	tagIDs        []uuid.UUID
	tagListErr    error
}

func (f *fakeMissionQuerier) CreateMission(_ context.Context, arg sqlc.CreateMissionParams) (sqlc.CreateMissionRow, error) {
	f.createParams = arg
	return f.createRow, f.createErr
}

func (f *fakeMissionQuerier) GetMissionByID(_ context.Context, _ sqlc.GetMissionByIDParams) (sqlc.GetMissionByIDRow, error) {
	return f.getRow, f.getErr
}

func (f *fakeMissionQuerier) ListMissions(_ context.Context, arg sqlc.ListMissionsParams) ([]sqlc.ListMissionsRow, error) {
	f.listParams = arg
	return f.listRows, f.listErr
}

func (f *fakeMissionQuerier) CountMissions(_ context.Context, arg sqlc.CountMissionsParams) (int64, error) {
	f.countParams = arg
	return f.countTotal, f.countErr
}

func (f *fakeMissionQuerier) UpdateMission(_ context.Context, arg sqlc.UpdateMissionParams) (sqlc.UpdateMissionRow, error) {
	f.updateParams = arg
	return f.updateRow, f.updateErr
}

func (f *fakeMissionQuerier) ListMissionMembers(_ context.Context, _ sqlc.ListMissionMembersParams) ([]sqlc.MissionMember, error) {
	return f.memberRows, f.memberListErr
}

func (f *fakeMissionQuerier) DeleteMissionMembers(_ context.Context, _ sqlc.DeleteMissionMembersParams) error {
	return nil
}

func (f *fakeMissionQuerier) DeleteMissionMemberByUser(_ context.Context, _ sqlc.DeleteMissionMemberByUserParams) error {
	return nil
}

func (f *fakeMissionQuerier) InsertMissionMember(_ context.Context, _ sqlc.InsertMissionMemberParams) error {
	return nil
}

func (f *fakeMissionQuerier) ListMissionTagIDs(_ context.Context, _ sqlc.ListMissionTagIDsParams) ([]uuid.UUID, error) {
	return f.tagIDs, f.tagListErr
}

func (f *fakeMissionQuerier) InsertMissionTag(_ context.Context, _ sqlc.InsertMissionTagParams) error {
	return nil
}

func (f *fakeMissionQuerier) DeleteMissionTagByTag(_ context.Context, _ sqlc.DeleteMissionTagByTagParams) error {
	return nil
}

func (f *fakeMissionQuerier) DeleteMissionTags(_ context.Context, _ sqlc.DeleteMissionTagsParams) error {
	return nil
}

func validCreateMissionRow() sqlc.CreateMissionRow {
	now := time.Now().UTC()
	return sqlc.CreateMissionRow{
		ID:             uuid.New(),
		OrganizationID: uuid.New(),
		OwnerID:        uuid.New(),
		Title:          "Valid mission",
		Status:         string(mission.StatusDraft),
		Visibility:     string(mission.VisibilityPublic),
		KanbanStatus:   string(mission.KanbanUncategorized),
		StartDate:      pgtype.Date{Time: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC), Valid: true},
		EndDate:        pgtype.Date{Time: time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC), Valid: true},
		CreatedAt:      now,
		UpdatedAt:      now,
	}
}

func validGetMissionRow() sqlc.GetMissionByIDRow {
	row := validCreateMissionRow()
	return sqlc.GetMissionByIDRow{
		ID:             row.ID,
		OrganizationID: row.OrganizationID,
		ParentID:       row.ParentID,
		OwnerID:        row.OwnerID,
		TeamID:         row.TeamID,
		Title:          row.Title,
		Description:    row.Description,
		Status:         row.Status,
		Visibility:     row.Visibility,
		KanbanStatus:   row.KanbanStatus,
		StartDate:      row.StartDate,
		EndDate:        row.EndDate,
		CompletedAt:    row.CompletedAt,
		CreatedAt:      row.CreatedAt,
		UpdatedAt:      row.UpdatedAt,
	}
}

func validListMissionRow() sqlc.ListMissionsRow {
	row := validCreateMissionRow()
	return sqlc.ListMissionsRow{
		ID:             row.ID,
		OrganizationID: row.OrganizationID,
		ParentID:       row.ParentID,
		OwnerID:        row.OwnerID,
		TeamID:         row.TeamID,
		Title:          row.Title,
		Description:    row.Description,
		Status:         row.Status,
		Visibility:     row.Visibility,
		KanbanStatus:   row.KanbanStatus,
		StartDate:      row.StartDate,
		EndDate:        row.EndDate,
		CompletedAt:    row.CompletedAt,
		CreatedAt:      row.CreatedAt,
		UpdatedAt:      row.UpdatedAt,
	}
}

func validUpdateMissionRow() sqlc.UpdateMissionRow {
	row := validCreateMissionRow()
	return sqlc.UpdateMissionRow{
		ID:             row.ID,
		OrganizationID: row.OrganizationID,
		ParentID:       row.ParentID,
		OwnerID:        row.OwnerID,
		TeamID:         row.TeamID,
		Title:          row.Title,
		Description:    row.Description,
		Status:         row.Status,
		Visibility:     row.Visibility,
		KanbanStatus:   row.KanbanStatus,
		StartDate:      row.StartDate,
		EndDate:        row.EndDate,
		CompletedAt:    row.CompletedAt,
		CreatedAt:      row.CreatedAt,
		UpdatedAt:      row.UpdatedAt,
	}
}

func TestMissionRepository_Create_TranslatesNullableFieldsAndMapsRow(t *testing.T) {
	now := time.Now().UTC()
	id := uuid.New()
	orgID := uuid.New()
	ownerID := uuid.New()
	parentID := uuid.New()
	teamID := uuid.New()
	start := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC)
	desc := "Reduzir churn em 20%"

	q := &fakeMissionQuerier{
		createRow: sqlc.CreateMissionRow{
			ID: id, OrganizationID: orgID,
			ParentID:     pgtype.UUID{Bytes: parentID, Valid: true},
			OwnerID:      ownerID,
			TeamID:       pgtype.UUID{Bytes: teamID, Valid: true},
			Title:        "Reduzir churn",
			Description:  pgtype.Text{String: desc, Valid: true},
			Status:       string(mission.StatusActive),
			Visibility:   string(mission.VisibilityPublic),
			KanbanStatus: string(mission.KanbanTodo),
			StartDate:    pgtype.Date{Time: start, Valid: true},
			EndDate:      pgtype.Date{Time: end, Valid: true},
			CompletedAt:  pgtype.Timestamptz{Valid: false},
			CreatedAt:    now, UpdatedAt: now,
		},
	}
	repo := NewMissionRepository(q, nil)

	got, err := repo.Create(context.Background(), &mission.Mission{
		ID: id, OrganizationID: orgID, ParentID: &parentID,
		OwnerID: ownerID, TeamID: &teamID, Title: "Reduzir churn",
		Description: &desc, Status: mission.StatusActive,
		Visibility: mission.VisibilityPublic, KanbanStatus: mission.KanbanTodo,
		StartDate: start, EndDate: end,
	})

	require.NoError(t, err)
	assert.Equal(t, id, got.ID)
	assert.Equal(t, "Reduzir churn", got.Title)
	require.NotNil(t, got.ParentID)
	assert.Equal(t, parentID, *got.ParentID)
	require.NotNil(t, got.TeamID)
	assert.Equal(t, teamID, *got.TeamID)
	require.NotNil(t, got.Description)
	assert.Equal(t, desc, *got.Description)
	assert.True(t, got.StartDate.Equal(start))
	assert.True(t, got.EndDate.Equal(end))
	assert.Nil(t, got.CompletedAt)

	// Querier received the right pgtype-converted params.
	assert.True(t, q.createParams.ParentID.Valid)
	assert.True(t, q.createParams.TeamID.Valid)
	assert.True(t, q.createParams.Description.Valid)
	assert.True(t, q.createParams.StartDate.Valid)
	assert.True(t, q.createParams.EndDate.Valid)
	assert.False(t, q.createParams.CompletedAt.Valid)
}

func TestMissionRepository_Create_NilOptionalFieldsBecomeInvalidPgtype(t *testing.T) {
	start := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC)
	row := validCreateMissionRow()
	row.Title = "x"
	row.StartDate = pgtype.Date{Time: start, Valid: true}
	row.EndDate = pgtype.Date{Time: end, Valid: true}
	q := &fakeMissionQuerier{createRow: row}
	repo := NewMissionRepository(q, nil)

	_, err := repo.Create(context.Background(), &mission.Mission{
		ID: uuid.New(), OrganizationID: uuid.New(), OwnerID: uuid.New(),
		Title: "x", Status: mission.StatusDraft, Visibility: mission.VisibilityPublic,
		KanbanStatus: mission.KanbanUncategorized, StartDate: start, EndDate: end,
	})

	require.NoError(t, err)
	assert.False(t, q.createParams.ParentID.Valid)
	assert.False(t, q.createParams.TeamID.Valid)
	assert.False(t, q.createParams.Description.Valid)
	assert.False(t, q.createParams.CompletedAt.Valid)
	// Dates are always valid — they're non-optional on the domain model.
	assert.True(t, q.createParams.StartDate.Valid)
	assert.True(t, q.createParams.EndDate.Valid)
}

func TestMissionRepository_Create_PropagatesQuerierError(t *testing.T) {
	queryErr := errors.New("insert failed")
	repo := NewMissionRepository(&fakeMissionQuerier{createErr: queryErr}, nil)

	_, err := repo.Create(context.Background(), &mission.Mission{ID: uuid.New(), Title: "x"})

	assert.ErrorIs(t, err, queryErr)
}

func TestMissionRepository_Create_FKViolation_MapsToInvalidReference(t *testing.T) {
	fkErr := &pgconn.PgError{Code: "23503", Message: "foreign key violation"}
	repo := NewMissionRepository(&fakeMissionQuerier{createErr: fkErr}, nil)

	_, err := repo.Create(context.Background(), &mission.Mission{ID: uuid.New(), Title: "x"})

	assert.ErrorIs(t, err, mission.ErrInvalidReference)
}

func TestMissionRepository_Create_InvalidLoadedAggregate_ReturnsValidationError(t *testing.T) {
	row := validCreateMissionRow()
	row.Title = ""
	repo := NewMissionRepository(&fakeMissionQuerier{createRow: row}, nil)

	_, err := repo.Create(context.Background(), &mission.Mission{
		ID: row.ID, OrganizationID: row.OrganizationID, OwnerID: row.OwnerID,
		Title: "valid input", Status: mission.StatusDraft, Visibility: mission.VisibilityPublic,
		KanbanStatus: mission.KanbanUncategorized, StartDate: row.StartDate.Time, EndDate: row.EndDate.Time,
	})

	assert.ErrorIs(t, err, domain.ErrValidation)
}

func TestMissionRepository_Update_FKViolation_MapsToInvalidReference(t *testing.T) {
	fkErr := &pgconn.PgError{Code: "23503", Message: "foreign key violation"}
	repo := NewMissionRepository(&fakeMissionQuerier{updateErr: fkErr}, nil)

	_, err := repo.Update(context.Background(), &mission.Mission{ID: uuid.New(), Title: "x"})

	assert.ErrorIs(t, err, mission.ErrInvalidReference)
}

func TestMissionRepository_GetByID_NotFound_MapsToDomainError(t *testing.T) {
	repo := NewMissionRepository(&fakeMissionQuerier{getErr: pgx.ErrNoRows}, nil)

	_, err := repo.GetByID(context.Background(), uuid.New(), uuid.New())

	assert.ErrorIs(t, err, mission.ErrNotFound)
}

func TestMissionRepository_GetByID_PropagatesOtherErrors(t *testing.T) {
	queryErr := errors.New("conn refused")
	repo := NewMissionRepository(&fakeMissionQuerier{getErr: queryErr}, nil)

	_, err := repo.GetByID(context.Background(), uuid.New(), uuid.New())

	assert.ErrorIs(t, err, queryErr)
}

func TestMissionRepository_GetByID_InvalidLoadedAggregate_ReturnsValidationError(t *testing.T) {
	row := validGetMissionRow()
	row.Status = "invalid"
	repo := NewMissionRepository(&fakeMissionQuerier{getRow: row}, nil)

	_, err := repo.GetByID(context.Background(), row.ID, row.OrganizationID)

	assert.ErrorIs(t, err, domain.ErrValidation)
}

func TestMissionRepository_List_AppliesPaginationDefaultsAndFilters(t *testing.T) {
	ownerID := uuid.New()
	teamID := uuid.New()
	parentID := uuid.New()
	status := mission.StatusActive

	rowA := validListMissionRow()
	rowA.Title = "a"
	rowB := validListMissionRow()
	rowB.Title = "b"
	q := &fakeMissionQuerier{listRows: []sqlc.ListMissionsRow{rowA, rowB}, countTotal: 7}
	repo := NewMissionRepository(q, nil)

	res, err := repo.List(context.Background(), mission.ListFilter{
		OrganizationID: uuid.New(),
		OwnerID:        &ownerID,
		TeamID:         &teamID,
		Status:         &status,
		ParentID:       &parentID,
		FilterByParent: true,
		Page:           0, // → 1
		Size:           0, // → 20
	})

	require.NoError(t, err)
	require.Len(t, res.Missions, 2)
	assert.Equal(t, int64(7), res.Total)
	assert.Equal(t, int32(20), q.listParams.Limit)
	assert.Equal(t, int32(0), q.listParams.Offset)
	assert.True(t, q.listParams.OwnerID.Valid)
	assert.True(t, q.listParams.TeamID.Valid)
	assert.True(t, q.listParams.ParentID.Valid)
	assert.True(t, q.listParams.FilterByParent)
	require.True(t, q.listParams.Status.Valid)
	assert.Equal(t, string(status), q.listParams.Status.String)
	// Count was called with the same filters.
	assert.Equal(t, q.listParams.Status, q.countParams.Status)
	assert.Equal(t, q.listParams.FilterByParent, q.countParams.FilterByParent)
}

func TestMissionRepository_List_PropagatesQueryError(t *testing.T) {
	queryErr := errors.New("list failed")
	repo := NewMissionRepository(&fakeMissionQuerier{listErr: queryErr}, nil)

	_, err := repo.List(context.Background(), mission.ListFilter{OrganizationID: uuid.New()})

	assert.ErrorIs(t, err, queryErr)
}

func TestMissionRepository_List_PropagatesCountError(t *testing.T) {
	countErr := errors.New("count failed")
	repo := NewMissionRepository(&fakeMissionQuerier{listRows: nil, countErr: countErr}, nil)

	_, err := repo.List(context.Background(), mission.ListFilter{OrganizationID: uuid.New()})

	assert.ErrorIs(t, err, countErr)
}

func TestMissionRepository_List_InvalidLoadedAggregate_ReturnsValidationError(t *testing.T) {
	row := validListMissionRow()
	row.Visibility = "invalid"
	repo := NewMissionRepository(&fakeMissionQuerier{listRows: []sqlc.ListMissionsRow{row}}, nil)

	_, err := repo.List(context.Background(), mission.ListFilter{OrganizationID: row.OrganizationID})

	assert.ErrorIs(t, err, domain.ErrValidation)
}

func TestMissionRepository_Update_NotFound_MapsToDomainError(t *testing.T) {
	repo := NewMissionRepository(&fakeMissionQuerier{updateErr: pgx.ErrNoRows}, nil)

	_, err := repo.Update(context.Background(), &mission.Mission{ID: uuid.New(), Title: "x"})

	assert.ErrorIs(t, err, mission.ErrNotFound)
}

func TestMissionRepository_Update_PassesNullableParent(t *testing.T) {
	parentID := uuid.New()
	start := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC)
	row := validUpdateMissionRow()
	row.Title = "x"
	row.Status = string(mission.StatusActive)
	row.KanbanStatus = string(mission.KanbanTodo)
	row.StartDate = pgtype.Date{Time: start, Valid: true}
	row.EndDate = pgtype.Date{Time: end, Valid: true}
	q := &fakeMissionQuerier{updateRow: row}
	repo := NewMissionRepository(q, nil)

	// to a parent
	_, err := repo.Update(context.Background(), &mission.Mission{
		ID: uuid.New(), Title: "x", ParentID: &parentID,
		Status: mission.StatusActive, Visibility: mission.VisibilityPublic,
		KanbanStatus: mission.KanbanTodo, StartDate: start, EndDate: end,
	})
	require.NoError(t, err)
	assert.True(t, q.updateParams.ParentID.Valid)

	// to root (nil)
	_, err = repo.Update(context.Background(), &mission.Mission{
		ID: uuid.New(), Title: "x",
		Status: mission.StatusActive, Visibility: mission.VisibilityPublic,
		KanbanStatus: mission.KanbanTodo, StartDate: start, EndDate: end,
	})
	require.NoError(t, err)
	assert.False(t, q.updateParams.ParentID.Valid)
}

func TestMissionRepository_Update_InvalidLoadedAggregate_ReturnsValidationError(t *testing.T) {
	row := validUpdateMissionRow()
	row.KanbanStatus = "invalid"
	repo := NewMissionRepository(&fakeMissionQuerier{updateRow: row}, nil)

	_, err := repo.Update(context.Background(), &mission.Mission{
		ID: row.ID, OrganizationID: row.OrganizationID, OwnerID: row.OwnerID,
		Title: "valid input", Status: mission.StatusDraft, Visibility: mission.VisibilityPublic,
		KanbanStatus: mission.KanbanUncategorized, StartDate: row.StartDate.Time, EndDate: row.EndDate.Time,
	})

	assert.ErrorIs(t, err, domain.ErrValidation)
}

func TestMissionRowToDomain_MapsAllFields(t *testing.T) {
	now := time.Now().UTC()
	id := uuid.New()
	orgID := uuid.New()
	ownerID := uuid.New()
	parentID := uuid.New()
	teamID := uuid.New()
	start := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC)
	completed := now.Add(-time.Hour)

	got := missionRowToDomain(missionRowData{
		ID: id, OrganizationID: orgID,
		ParentID:     pgtype.UUID{Bytes: parentID, Valid: true},
		OwnerID:      ownerID,
		TeamID:       pgtype.UUID{Bytes: teamID, Valid: true},
		Title:        "T",
		Description:  pgtype.Text{String: "d", Valid: true},
		Status:       string(mission.StatusCompleted),
		Visibility:   string(mission.VisibilityTeamOnly),
		KanbanStatus: string(mission.KanbanDone),
		StartDate:    pgtype.Date{Time: start, Valid: true},
		EndDate:      pgtype.Date{Time: end, Valid: true},
		CompletedAt:  pgtype.Timestamptz{Time: completed, Valid: true},
		CreatedAt:    now, UpdatedAt: now,
	})

	assert.Equal(t, id, got.ID)
	assert.Equal(t, orgID, got.OrganizationID)
	require.NotNil(t, got.ParentID)
	assert.Equal(t, parentID, *got.ParentID)
	assert.Equal(t, ownerID, got.OwnerID)
	require.NotNil(t, got.TeamID)
	assert.Equal(t, teamID, *got.TeamID)
	require.NotNil(t, got.Description)
	assert.Equal(t, "d", *got.Description)
	assert.Equal(t, mission.StatusCompleted, got.Status)
	assert.Equal(t, mission.VisibilityTeamOnly, got.Visibility)
	assert.Equal(t, mission.KanbanDone, got.KanbanStatus)
	assert.True(t, got.StartDate.Equal(start))
	assert.True(t, got.EndDate.Equal(end))
	require.NotNil(t, got.CompletedAt)
	assert.Equal(t, completed, *got.CompletedAt)
}

func TestMissionRowToDomain_NullPgtypesMapToNil(t *testing.T) {
	got := missionRowToDomain(missionRowData{
		ID: uuid.New(), OrganizationID: uuid.New(), OwnerID: uuid.New(),
		Title: "x", Status: string(mission.StatusDraft),
		Visibility: string(mission.VisibilityPublic), KanbanStatus: string(mission.KanbanUncategorized),
	})

	assert.Nil(t, got.ParentID)
	assert.Nil(t, got.TeamID)
	assert.Nil(t, got.Description)
	assert.Nil(t, got.CompletedAt)
}

func TestMissionPgtypeHelpers_RoundTrip(t *testing.T) {
	id := uuid.New()
	now := time.Now().UTC()

	// uuid pointer ↔ pgtype.UUID
	assert.False(t, uuidPtrToPgtype(nil).Valid)
	assert.Equal(t, pgtype.UUID{Bytes: id, Valid: true}, uuidPtrToPgtype(&id))
	assert.Nil(t, pgtypeToUUIDPtr(pgtype.UUID{Valid: false}))
	require.NotNil(t, pgtypeToUUIDPtr(pgtype.UUID{Bytes: id, Valid: true}))
	assert.Equal(t, id, *pgtypeToUUIDPtr(pgtype.UUID{Bytes: id, Valid: true}))

	// time pointer ↔ pgtype.Timestamptz
	assert.False(t, timeToPgtypeTimestamptz(nil).Valid)
	assert.Equal(t, now, timeToPgtypeTimestamptz(&now).Time)
	assert.Nil(t, pgtypeTimestamptzToTime(pgtype.Timestamptz{Valid: false}))
	require.NotNil(t, pgtypeTimestamptzToTime(pgtype.Timestamptz{Time: now, Valid: true}))
	assert.Equal(t, now, *pgtypeTimestamptzToTime(pgtype.Timestamptz{Time: now, Valid: true}))
}
