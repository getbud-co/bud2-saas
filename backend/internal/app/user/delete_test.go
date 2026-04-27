package user

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	apptx "github.com/getbud-co/bud2/backend/internal/app/tx"
	domainindicator "github.com/getbud-co/bud2/backend/internal/domain/indicator"
	domainmission "github.com/getbud-co/bud2/backend/internal/domain/mission"
	"github.com/getbud-co/bud2/backend/internal/domain/organization"
	domaintask "github.com/getbud-co/bud2/backend/internal/domain/task"
	"github.com/getbud-co/bud2/backend/internal/domain/team"
	usr "github.com/getbud-co/bud2/backend/internal/domain/user"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

type deleteUserTestTxRepos struct {
	userRepo usr.Repository
	teamRepo team.Repository
}

func (r deleteUserTestTxRepos) Organizations() organization.Repository    { return nil }
func (r deleteUserTestTxRepos) Users() usr.Repository                     { return r.userRepo }
func (r deleteUserTestTxRepos) Teams() team.Repository                    { return r.teamRepo }
func (r deleteUserTestTxRepos) Missions() domainmission.Repository        { return nil }
func (r deleteUserTestTxRepos) Indicators() domainindicator.Repository    { return nil }
func (r deleteUserTestTxRepos) Tasks() domaintask.Repository              { return nil }

type deleteUserTeamRepo struct {
	softDeleteMemberByUserCalled bool
	organizationID               uuid.UUID
	userID                       uuid.UUID
	err                          error
}

func (r *deleteUserTeamRepo) Create(context.Context, *team.Team) (*team.Team, error) {
	panic("unexpected call")
}

func (r *deleteUserTeamRepo) GetByID(context.Context, uuid.UUID, uuid.UUID) (*team.Team, error) {
	panic("unexpected call")
}

func (r *deleteUserTeamRepo) GetByName(context.Context, uuid.UUID, string) (*team.Team, error) {
	panic("unexpected call")
}

func (r *deleteUserTeamRepo) List(context.Context, uuid.UUID, *team.Status, int, int) (team.ListResult, error) {
	panic("unexpected call")
}

func (r *deleteUserTeamRepo) Update(context.Context, *team.Team) (*team.Team, error) {
	panic("unexpected call")
}

func (r *deleteUserTeamRepo) SoftDelete(context.Context, uuid.UUID, uuid.UUID) error {
	panic("unexpected call")
}

func (r *deleteUserTeamRepo) SoftDeleteMemberByUser(_ context.Context, organizationID, userID uuid.UUID) error {
	r.softDeleteMemberByUserCalled = true
	r.organizationID = organizationID
	r.userID = userID
	return r.err
}

func (r *deleteUserTeamRepo) ListMembersByUser(context.Context, uuid.UUID, uuid.UUID) ([]team.TeamMember, error) {
	return nil, nil
}

func (r *deleteUserTeamRepo) ListTeamIDsByUsers(context.Context, uuid.UUID, []uuid.UUID) (map[uuid.UUID][]uuid.UUID, error) {
	return nil, nil
}

func (r *deleteUserTeamRepo) SyncMembersByUser(context.Context, uuid.UUID, uuid.UUID, []uuid.UUID, team.RoleInTeam) error {
	panic("unexpected call")
}

type deleteUserTestTxManager struct {
	repos     apptx.Repositories
	called    bool
	returnErr error
}

func (m *deleteUserTestTxManager) WithTx(ctx context.Context, fn func(repos apptx.Repositories) error) error {
	m.called = true
	if m.returnErr != nil {
		return m.returnErr
	}
	return fn(m.repos)
}

func TestDeleteUseCase_Execute_Success(t *testing.T) {
	txUsers := new(mocks.UserRepository)
	teamRepo := &deleteUserTeamRepo{}
	txm := &deleteUserTestTxManager{repos: deleteUserTestTxRepos{userRepo: txUsers, teamRepo: teamRepo}}
	uc := NewDeleteUseCase(txm, testutil.NewDiscardLogger())

	organizationID := fixtures.NewTestTenantID()
	targetUser := fixtures.NewUserWithMembership()
	targetUser.Memberships[0].OrganizationID = organizationID.UUID()

	txUsers.On("GetByIDForOrganization", mock.Anything, targetUser.ID, organizationID.UUID()).Return(targetUser, nil)
	txUsers.On("DeleteMembership", mock.Anything, organizationID.UUID(), targetUser.ID).Return(nil)

	err := uc.Execute(context.Background(), DeleteCommand{
		OrganizationID:  organizationID,
		RequesterUserID: uuid.New(),
		TargetUserID:    targetUser.ID,
	})

	assert.NoError(t, err)
	assert.True(t, txm.called)
	assert.True(t, teamRepo.softDeleteMemberByUserCalled)
	assert.Equal(t, organizationID.UUID(), teamRepo.organizationID)
	assert.Equal(t, targetUser.ID, teamRepo.userID)
}

func TestDeleteUseCase_Execute_RejectsSelfDelete(t *testing.T) {
	userID := uuid.New()
	uc := NewDeleteUseCase(&deleteUserTestTxManager{}, testutil.NewDiscardLogger())

	err := uc.Execute(context.Background(), DeleteCommand{
		OrganizationID:  fixtures.NewTestTenantID(),
		RequesterUserID: userID,
		TargetUserID:    userID,
	})

	assert.ErrorIs(t, err, ErrCannotDeleteOwnMembership)
}

func TestDeleteUseCase_Execute_MembershipNotFound(t *testing.T) {
	txUsers := new(mocks.UserRepository)
	txm := &deleteUserTestTxManager{repos: deleteUserTestTxRepos{userRepo: txUsers, teamRepo: &deleteUserTeamRepo{}}}
	uc := NewDeleteUseCase(txm, testutil.NewDiscardLogger())

	targetUser := fixtures.NewUser()
	organizationID := fixtures.NewTestTenantID()
	txUsers.On("GetByIDForOrganization", mock.Anything, targetUser.ID, organizationID.UUID()).Return(nil, organization.ErrMembershipNotFound)

	err := uc.Execute(context.Background(), DeleteCommand{
		OrganizationID:  organizationID,
		RequesterUserID: uuid.New(),
		TargetUserID:    targetUser.ID,
	})

	assert.ErrorIs(t, err, organization.ErrMembershipNotFound)
}

func TestDeleteUseCase_Execute_StopsWhenRemovingUserFromTeamsFails(t *testing.T) {
	txUsers := new(mocks.UserRepository)
	teamRepo := &deleteUserTeamRepo{err: errors.New("team cleanup failed")}
	txm := &deleteUserTestTxManager{repos: deleteUserTestTxRepos{userRepo: txUsers, teamRepo: teamRepo}}
	uc := NewDeleteUseCase(txm, testutil.NewDiscardLogger())

	targetUser := fixtures.NewUserWithMembership()
	organizationID := fixtures.NewTestTenantID()
	targetUser.Memberships[0].OrganizationID = organizationID.UUID()
	txUsers.On("GetByIDForOrganization", mock.Anything, targetUser.ID, organizationID.UUID()).Return(targetUser, nil)

	err := uc.Execute(context.Background(), DeleteCommand{
		OrganizationID:  organizationID,
		RequesterUserID: uuid.New(),
		TargetUserID:    targetUser.ID,
	})

	assert.EqualError(t, err, "team cleanup failed")
	assert.True(t, teamRepo.softDeleteMemberByUserCalled)
	txUsers.AssertNotCalled(t, "DeleteMembership", mock.Anything, mock.Anything, mock.Anything)
}

func TestDeleteUseCase_Execute_TransactionError(t *testing.T) {
	txm := &deleteUserTestTxManager{returnErr: errors.New("tx error")}
	uc := NewDeleteUseCase(txm, testutil.NewDiscardLogger())

	err := uc.Execute(context.Background(), DeleteCommand{
		OrganizationID:  fixtures.NewTestTenantID(),
		RequesterUserID: uuid.New(),
		TargetUserID:    uuid.New(),
	})

	assert.Error(t, err)
	assert.True(t, txm.called)
}
