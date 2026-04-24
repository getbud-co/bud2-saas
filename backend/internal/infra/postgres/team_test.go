package postgres

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/getbud-co/bud2/backend/internal/domain/team"
	"github.com/getbud-co/bud2/backend/internal/infra/postgres/sqlc"
)

type fakeTeamQuerier struct {
	softDeleteMembersByTeamArg uuid.UUID
	softDeleteTeamArg          sqlc.SoftDeleteTeamParams
	softDeleteMemberByUserArg  sqlc.SoftDeleteTeamMembersByOrganizationUserParams
	listMembersByUserArg       sqlc.ListTeamMembersByOrganizationUserParams
	listMembersByUsersArg      sqlc.ListTeamMembersByOrganizationUsersParams

	listMembersByUserRows  []sqlc.ListTeamMembersByOrganizationUserRow
	listMembersByUsersRows []sqlc.ListTeamMembersByOrganizationUsersRow
}

func (f *fakeTeamQuerier) CreateTeam(context.Context, sqlc.CreateTeamParams) (sqlc.CreateTeamRow, error) {
	panic("not implemented")
}
func (f *fakeTeamQuerier) GetTeamByID(context.Context, sqlc.GetTeamByIDParams) (sqlc.GetTeamByIDRow, error) {
	panic("not implemented")
}
func (f *fakeTeamQuerier) GetTeamByName(context.Context, sqlc.GetTeamByNameParams) (sqlc.GetTeamByNameRow, error) {
	panic("not implemented")
}
func (f *fakeTeamQuerier) ListTeams(context.Context, sqlc.ListTeamsParams) ([]sqlc.ListTeamsRow, error) {
	panic("not implemented")
}
func (f *fakeTeamQuerier) ListTeamsByStatus(context.Context, sqlc.ListTeamsByStatusParams) ([]sqlc.ListTeamsByStatusRow, error) {
	panic("not implemented")
}
func (f *fakeTeamQuerier) CountTeams(context.Context, uuid.UUID) (int64, error) {
	panic("not implemented")
}
func (f *fakeTeamQuerier) CountTeamsByStatus(context.Context, sqlc.CountTeamsByStatusParams) (int64, error) {
	panic("not implemented")
}
func (f *fakeTeamQuerier) UpdateTeam(context.Context, sqlc.UpdateTeamParams) (sqlc.UpdateTeamRow, error) {
	panic("not implemented")
}
func (f *fakeTeamQuerier) SoftDeleteTeam(_ context.Context, arg sqlc.SoftDeleteTeamParams) error {
	f.softDeleteTeamArg = arg
	return nil
}
func (f *fakeTeamQuerier) CreateTeamMember(context.Context, sqlc.CreateTeamMemberParams) (sqlc.CreateTeamMemberRow, error) {
	panic("not implemented")
}
func (f *fakeTeamQuerier) ListTeamMembers(context.Context, sqlc.ListTeamMembersParams) ([]sqlc.ListTeamMembersRow, error) {
	panic("not implemented")
}
func (f *fakeTeamQuerier) ListTeamMembersForSync(context.Context, uuid.UUID) ([]sqlc.ListTeamMembersForSyncRow, error) {
	panic("not implemented")
}
func (f *fakeTeamQuerier) GetTeamMemberByTeamAndUser(context.Context, sqlc.GetTeamMemberByTeamAndUserParams) (sqlc.GetTeamMemberByTeamAndUserRow, error) {
	panic("not implemented")
}
func (f *fakeTeamQuerier) UpdateTeamMember(context.Context, sqlc.UpdateTeamMemberParams) (sqlc.UpdateTeamMemberRow, error) {
	panic("not implemented")
}
func (f *fakeTeamQuerier) SoftDeleteTeamMember(context.Context, uuid.UUID) error {
	panic("not implemented")
}
func (f *fakeTeamQuerier) SoftDeleteTeamMembersByTeam(_ context.Context, teamID uuid.UUID) error {
	f.softDeleteMembersByTeamArg = teamID
	return nil
}
func (f *fakeTeamQuerier) SoftDeleteTeamMembersByOrganizationUser(_ context.Context, arg sqlc.SoftDeleteTeamMembersByOrganizationUserParams) error {
	f.softDeleteMemberByUserArg = arg
	return nil
}
func (f *fakeTeamQuerier) ListTeamMembersByOrganizationUser(_ context.Context, arg sqlc.ListTeamMembersByOrganizationUserParams) ([]sqlc.ListTeamMembersByOrganizationUserRow, error) {
	f.listMembersByUserArg = arg
	return f.listMembersByUserRows, nil
}
func (f *fakeTeamQuerier) ListTeamMembersByOrganizationUsers(_ context.Context, arg sqlc.ListTeamMembersByOrganizationUsersParams) ([]sqlc.ListTeamMembersByOrganizationUsersRow, error) {
	f.listMembersByUsersArg = arg
	return f.listMembersByUsersRows, nil
}

func TestTeamRowToDomain_MapsFields(t *testing.T) {
	now := time.Now().UTC()
	description := pgtype.Text{String: "Team description", Valid: true}
	id := uuid.New()
	orgID := uuid.New()

	result := teamRowToDomain(id, orgID, "Platform", description, "orange", "archived", now, now.Add(time.Hour))

	require.NotNil(t, result)
	assert.Equal(t, id, result.ID)
	assert.Equal(t, orgID, result.OrganizationID)
	assert.Equal(t, "Platform", result.Name)
	require.NotNil(t, result.Description)
	assert.Equal(t, "Team description", *result.Description)
	assert.Equal(t, team.ColorOrange, result.Color)
	assert.Equal(t, team.StatusArchived, result.Status)
	assert.Equal(t, now, result.CreatedAt)
	assert.Equal(t, now.Add(time.Hour), result.UpdatedAt)
}

func TestListTeamMembersRowToDomain_MapsFields(t *testing.T) {
	now := time.Now().UTC()
	row := sqlc.ListTeamMembersRow{
		ID:         uuid.New(),
		TeamID:     uuid.New(),
		UserID:     uuid.New(),
		RoleInTeam: string(team.RoleObserver),
		JoinedAt:   now,
		CreatedAt:  now.Add(time.Minute),
		UpdatedAt:  now.Add(2 * time.Minute),
		FirstName:  "Ada",
		LastName:   "Lovelace",
		JobTitle:   pgtype.Text{String: "Engineer", Valid: true},
	}

	result := listTeamMembersRowToDomain(row)

	assert.Equal(t, row.ID, result.ID)
	assert.Equal(t, row.TeamID, result.TeamID)
	assert.Equal(t, row.UserID, result.UserID)
	assert.Equal(t, team.RoleObserver, result.RoleInTeam)
	assert.Equal(t, row.JoinedAt, result.JoinedAt)
	require.NotNil(t, result.UserFirstName)
	require.NotNil(t, result.UserLastName)
	require.NotNil(t, result.UserJobTitle)
	assert.Equal(t, "Ada", *result.UserFirstName)
	assert.Equal(t, "Lovelace", *result.UserLastName)
	assert.Equal(t, "Engineer", *result.UserJobTitle)
}

func TestTeamRepositoryListTeamIDsByUsers_EmptyInputSkipsQuery(t *testing.T) {
	q := &fakeTeamQuerier{}
	repo := NewTeamRepository(q)

	result, err := repo.ListTeamIDsByUsers(context.Background(), uuid.New(), nil)

	require.NoError(t, err)
	assert.Empty(t, result)
	assert.Equal(t, uuid.Nil, q.listMembersByUsersArg.OrganizationID)
}

func TestTeamRepositoryListTeamIDsByUsers_MapsRows(t *testing.T) {
	orgID := uuid.New()
	firstUserID := uuid.New()
	secondUserID := uuid.New()
	firstTeamID := uuid.New()
	secondTeamID := uuid.New()
	q := &fakeTeamQuerier{
		listMembersByUsersRows: []sqlc.ListTeamMembersByOrganizationUsersRow{
			{UserID: firstUserID, TeamID: firstTeamID},
			{UserID: firstUserID, TeamID: secondTeamID},
			{UserID: secondUserID, TeamID: secondTeamID},
		},
	}
	repo := NewTeamRepository(q)

	result, err := repo.ListTeamIDsByUsers(context.Background(), orgID, []uuid.UUID{firstUserID, secondUserID})

	require.NoError(t, err)
	assert.Equal(t, orgID, q.listMembersByUsersArg.OrganizationID)
	assert.Equal(t, []uuid.UUID{firstUserID, secondUserID}, q.listMembersByUsersArg.UserIds)
	assert.Equal(t, []uuid.UUID{firstTeamID, secondTeamID}, result[firstUserID])
	assert.Equal(t, []uuid.UUID{secondTeamID}, result[secondUserID])
}

func TestTeamRepositorySoftDelete_DeletesMembersThenTeam(t *testing.T) {
	q := &fakeTeamQuerier{}
	repo := NewTeamRepository(q)
	teamID := uuid.New()
	orgID := uuid.New()

	err := repo.SoftDelete(context.Background(), teamID, orgID)

	require.NoError(t, err)
	assert.Equal(t, teamID, q.softDeleteMembersByTeamArg)
	assert.Equal(t, sqlc.SoftDeleteTeamParams{ID: teamID, OrganizationID: orgID}, q.softDeleteTeamArg)
}

func TestTeamRepositorySoftDeleteMemberByUser_UsesOrganizationScope(t *testing.T) {
	q := &fakeTeamQuerier{}
	repo := NewTeamRepository(q)
	orgID := uuid.New()
	userID := uuid.New()

	err := repo.SoftDeleteMemberByUser(context.Background(), orgID, userID)

	require.NoError(t, err)
	assert.Equal(t, sqlc.SoftDeleteTeamMembersByOrganizationUserParams{OrganizationID: orgID, UserID: userID}, q.softDeleteMemberByUserArg)
}

func TestTeamRepositoryListMembersByUser_MapsRows(t *testing.T) {
	orgID := uuid.New()
	userID := uuid.New()
	now := time.Now().UTC()
	q := &fakeTeamQuerier{
		listMembersByUserRows: []sqlc.ListTeamMembersByOrganizationUserRow{
			{
				ID:         uuid.New(),
				TeamID:     uuid.New(),
				UserID:     userID,
				RoleInTeam: string(team.RoleMember),
				JoinedAt:   now,
				CreatedAt:  now.Add(time.Minute),
				UpdatedAt:  now.Add(2 * time.Minute),
			},
		},
	}
	repo := NewTeamRepository(q)

	result, err := repo.ListMembersByUser(context.Background(), orgID, userID)

	require.NoError(t, err)
	assert.Equal(t, sqlc.ListTeamMembersByOrganizationUserParams{OrganizationID: orgID, UserID: userID}, q.listMembersByUserArg)
	require.Len(t, result, 1)
	assert.Equal(t, q.listMembersByUserRows[0].ID, result[0].ID)
	assert.Equal(t, q.listMembersByUserRows[0].TeamID, result[0].TeamID)
	assert.Equal(t, team.RoleMember, result[0].RoleInTeam)
	assert.Equal(t, now, result[0].JoinedAt)
}
