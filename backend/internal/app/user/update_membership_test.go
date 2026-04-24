package user

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	apptx "github.com/getbud-co/bud2/backend/internal/app/tx"
	"github.com/getbud-co/bud2/backend/internal/domain"
	"github.com/getbud-co/bud2/backend/internal/domain/membership"
	org "github.com/getbud-co/bud2/backend/internal/domain/organization"
	"github.com/getbud-co/bud2/backend/internal/domain/team"
	usr "github.com/getbud-co/bud2/backend/internal/domain/user"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

type fakeTxManager struct {
	repos apptx.Repositories
}

func (m fakeTxManager) WithTx(ctx context.Context, fn func(repos apptx.Repositories) error) error {
	return fn(m.repos)
}

type fakeRepositories struct {
	users usr.Repository
	orgs  org.Repository
	teams team.Repository
}

func (r fakeRepositories) Organizations() org.Repository { return r.orgs }
func (r fakeRepositories) Users() usr.Repository         { return r.users }
func (r fakeRepositories) Teams() team.Repository        { return r.teams }

type fakeTeamRepository struct {
	softDeleteMemberByUserCalls int
	organizationID              uuid.UUID
	userID                      uuid.UUID
	err                         error
}

func (r *fakeTeamRepository) Create(context.Context, *team.Team) (*team.Team, error) {
	panic("unexpected call")
}
func (r *fakeTeamRepository) GetByID(context.Context, uuid.UUID, uuid.UUID) (*team.Team, error) {
	panic("unexpected call")
}
func (r *fakeTeamRepository) GetByName(context.Context, uuid.UUID, string) (*team.Team, error) {
	panic("unexpected call")
}
func (r *fakeTeamRepository) List(context.Context, uuid.UUID, *team.Status, int, int) (team.ListResult, error) {
	panic("unexpected call")
}
func (r *fakeTeamRepository) Update(context.Context, *team.Team) (*team.Team, error) {
	panic("unexpected call")
}
func (r *fakeTeamRepository) SoftDelete(context.Context, uuid.UUID, uuid.UUID) error {
	panic("unexpected call")
}
func (r *fakeTeamRepository) SoftDeleteMemberByUser(_ context.Context, organizationID, userID uuid.UUID) error {
	r.softDeleteMemberByUserCalls++
	r.organizationID = organizationID
	r.userID = userID
	return r.err
}

func (r *fakeTeamRepository) ListMembersByUser(context.Context, uuid.UUID, uuid.UUID) ([]team.TeamMember, error) {
	return nil, nil
}

func (r *fakeTeamRepository) ListTeamIDsByUsers(context.Context, uuid.UUID, []uuid.UUID) (map[uuid.UUID][]uuid.UUID, error) {
	return nil, nil
}

func (r *fakeTeamRepository) SyncMembersByUser(context.Context, uuid.UUID, uuid.UUID, []uuid.UUID, team.RoleInTeam) error {
	panic("unexpected call")
}

func TestUpdateMembershipUseCase_Execute_Success(t *testing.T) {
	users := new(mocks.UserRepository)
	teams := &fakeTeamRepository{}
	uc := NewUpdateMembershipUseCase(fakeTxManager{repos: fakeRepositories{users: users, teams: teams}}, testutil.NewDiscardLogger())

	u := fixtures.NewUserWithMembership()
	organizationID := domain.TenantID(u.Memberships[0].OrganizationID)
	updated := fixtures.NewUserWithMembership()
	updated.ID = u.ID
	updated.Memberships[0].OrganizationID = u.Memberships[0].OrganizationID
	updated.Memberships[0].Role = membership.RoleGestor
	updated.Memberships[0].Status = membership.StatusInactive

	users.On("GetByIDForOrganization", mock.Anything, u.ID, organizationID.UUID()).Return(u, nil)
	users.On("Update", mock.Anything, mock.MatchedBy(func(target *usr.User) bool {
		m, err := target.MembershipForOrganization(organizationID.UUID())
		return err == nil && m.Role == membership.RoleGestor && m.Status == membership.StatusInactive
	})).Return(updated, nil)

	result, err := uc.Execute(context.Background(), UpdateMembershipCommand{
		OrganizationID: organizationID,
		ID:             u.ID,
		Role:           string(membership.RoleGestor),
		Status:         string(membership.StatusInactive),
	})

	require.NoError(t, err)
	assert.Equal(t, membership.RoleGestor, result.Role)
	assert.Equal(t, membership.StatusInactive, result.Status)
	assert.Equal(t, 1, teams.softDeleteMemberByUserCalls)
	assert.Equal(t, organizationID.UUID(), teams.organizationID)
	assert.Equal(t, u.ID, teams.userID)
}

func TestUpdateMembershipUseCase_Execute_ReturnsNotFoundForOtherOrganization(t *testing.T) {
	users := new(mocks.UserRepository)
	uc := NewUpdateMembershipUseCase(fakeTxManager{repos: fakeRepositories{users: users, teams: &fakeTeamRepository{}}}, testutil.NewDiscardLogger())

	u := fixtures.NewUserWithMembership()
	otherOrgID := domain.TenantID(uuid.New())
	users.On("GetByIDForOrganization", mock.Anything, u.ID, otherOrgID.UUID()).Return(nil, membership.ErrNotFound)

	result, err := uc.Execute(context.Background(), UpdateMembershipCommand{
		OrganizationID: otherOrgID,
		ID:             u.ID,
		Role:           string(membership.RoleGestor),
		Status:         string(membership.StatusInactive),
	})

	assert.ErrorIs(t, err, membership.ErrNotFound)
	assert.Nil(t, result)
	users.AssertNotCalled(t, "Update")
}

func TestUpdateMembershipUseCase_Execute_ValidationError(t *testing.T) {
	users := new(mocks.UserRepository)
	teams := &fakeTeamRepository{}
	uc := NewUpdateMembershipUseCase(fakeTxManager{repos: fakeRepositories{users: users, teams: teams}}, testutil.NewDiscardLogger())

	u := fixtures.NewUserWithMembership()
	organizationID := domain.TenantID(u.Memberships[0].OrganizationID)
	users.On("GetByIDForOrganization", mock.Anything, u.ID, organizationID.UUID()).Return(u, nil)

	result, err := uc.Execute(context.Background(), UpdateMembershipCommand{
		OrganizationID: organizationID,
		ID:             u.ID,
		Role:           "invalid",
		Status:         string(membership.StatusInactive),
	})

	assert.Error(t, err)
	assert.Nil(t, result)
	users.AssertNotCalled(t, "Update")
	assert.Equal(t, 0, teams.softDeleteMemberByUserCalls)
}

func TestUpdateMembershipUseCase_Execute_DoesNotCleanupTeamsForActiveMembership(t *testing.T) {
	users := new(mocks.UserRepository)
	teams := &fakeTeamRepository{}
	uc := NewUpdateMembershipUseCase(fakeTxManager{repos: fakeRepositories{users: users, teams: teams}}, testutil.NewDiscardLogger())

	u := fixtures.NewUserWithMembership()
	organizationID := domain.TenantID(u.Memberships[0].OrganizationID)
	updated := fixtures.NewUserWithMembership()
	updated.ID = u.ID
	updated.Memberships[0].OrganizationID = u.Memberships[0].OrganizationID

	users.On("GetByIDForOrganization", mock.Anything, u.ID, organizationID.UUID()).Return(u, nil)
	users.On("Update", mock.Anything, mock.AnythingOfType("*user.User")).Return(updated, nil)

	result, err := uc.Execute(context.Background(), UpdateMembershipCommand{
		OrganizationID: organizationID,
		ID:             u.ID,
		Role:           string(membership.RoleSuperAdmin),
		Status:         string(membership.StatusActive),
	})

	require.NoError(t, err)
	assert.Equal(t, membership.StatusActive, result.Status)
	assert.Equal(t, 0, teams.softDeleteMemberByUserCalls)
}
