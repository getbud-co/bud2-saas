package team

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domainorg "github.com/getbud-co/bud2/backend/internal/domain/organization"
	domainteam "github.com/getbud-co/bud2/backend/internal/domain/team"
	domainuser "github.com/getbud-co/bud2/backend/internal/domain/user"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func TestUpdateUseCase_Execute_Success(t *testing.T) {
	teamRepo := new(mocks.TeamRepository)
	userRepo := new(mocks.UserRepository)
	txm := createTeamTxManager{repos: createTeamTxRepos{teamRepo: teamRepo, userRepo: userRepo}}
	uc := NewUpdateUseCase(teamRepo, userRepo, txm, testutil.NewDiscardLogger())

	tenantID := fixtures.NewTestTenantID()
	existing := fixtures.NewTeam()
	existing.OrganizationID = tenantID.UUID()
	existing.Name = "Old Team"
	userID := uuid.New()
	activeUser := fixtures.NewUserWithMembership()
	activeUser.ID = userID
	activeUser.Memberships[0].OrganizationID = tenantID.UUID()
	activeUser.Memberships[0].Status = domainorg.MembershipStatusActive
	updated := fixtures.NewTeam()
	updated.Name = "New Team"

	teamRepo.On("GetByID", mock.Anything, existing.ID, tenantID.UUID()).Return(existing, nil)
	teamRepo.On("GetByName", mock.Anything, tenantID.UUID(), "New Team").Return(nil, domainteam.ErrNotFound)
	userRepo.On("GetByIDForOrganization", mock.Anything, userID, tenantID.UUID()).Return(activeUser, nil)
	teamRepo.On("Update", mock.Anything, mock.MatchedBy(func(t *domainteam.Team) bool {
		return t.ID == existing.ID &&
			t.Name == "New Team" &&
			t.Color == domainteam.ColorNeutral &&
			t.Status == domainteam.StatusActive &&
			len(t.Members) == 1 &&
			t.Members[0].UserID == userID &&
			t.Members[0].RoleInTeam == domainteam.RoleLeader
	})).Return(updated, nil)

	result, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID,
		ID:             existing.ID,
		Name:           "New Team",
		Color:          "neutral",
		Status:         "active",
		Members:        []MemberInput{{UserID: userID, RoleInTeam: "leader"}},
	})

	assert.NoError(t, err)
	assert.Equal(t, updated, result)
	teamRepo.AssertExpectations(t)
	userRepo.AssertExpectations(t)
}

func TestUpdateUseCase_Execute_SameNameSkipsUniquenessCheck(t *testing.T) {
	teamRepo := new(mocks.TeamRepository)
	userRepo := new(mocks.UserRepository)
	txm := createTeamTxManager{repos: createTeamTxRepos{teamRepo: teamRepo, userRepo: userRepo}}
	uc := NewUpdateUseCase(teamRepo, userRepo, txm, testutil.NewDiscardLogger())

	tenantID := fixtures.NewTestTenantID()
	existing := fixtures.NewTeam()
	existing.OrganizationID = tenantID.UUID()
	existing.Name = "Same Team"
	existing.Members = nil

	teamRepo.On("GetByID", mock.Anything, existing.ID, tenantID.UUID()).Return(existing, nil)
	teamRepo.On("Update", mock.Anything, existing).Return(existing, nil)

	result, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID,
		ID:             existing.ID,
		Name:           "Same Team",
		Color:          "neutral",
		Status:         "active",
	})

	assert.NoError(t, err)
	assert.Equal(t, existing, result)
	teamRepo.AssertNotCalled(t, "GetByName", mock.Anything, mock.Anything, mock.Anything)
	teamRepo.AssertExpectations(t)
}

func TestUpdateUseCase_Execute_NoLeaderReturnsValidationError(t *testing.T) {
	uc := NewUpdateUseCase(nil, nil, createTeamTxManager{}, testutil.NewDiscardLogger())

	_, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		ID:             uuid.New(),
		Name:           "Team",
		Color:          "neutral",
		Status:         "active",
		Members:        []MemberInput{{UserID: uuid.New(), RoleInTeam: "member"}},
	})

	assert.ErrorIs(t, err, domain.ErrValidation)
}

func TestUpdateUseCase_Execute_DuplicateNameReturnsConflict(t *testing.T) {
	teamRepo := new(mocks.TeamRepository)
	userRepo := new(mocks.UserRepository)
	txm := createTeamTxManager{repos: createTeamTxRepos{teamRepo: teamRepo, userRepo: userRepo}}
	uc := NewUpdateUseCase(teamRepo, userRepo, txm, testutil.NewDiscardLogger())

	tenantID := fixtures.NewTestTenantID()
	existing := fixtures.NewTeam()
	existing.Name = "Old Team"
	teamRepo.On("GetByID", mock.Anything, existing.ID, tenantID.UUID()).Return(existing, nil)
	teamRepo.On("GetByName", mock.Anything, tenantID.UUID(), "Existing Team").Return(fixtures.NewTeam(), nil)

	_, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID,
		ID:             existing.ID,
		Name:           "Existing Team",
		Color:          "neutral",
		Status:         "active",
		Members:        []MemberInput{{UserID: uuid.New(), RoleInTeam: "leader"}},
	})

	assert.ErrorIs(t, err, domainteam.ErrNameExists)
	teamRepo.AssertNotCalled(t, "Update", mock.Anything, mock.Anything)
}

func TestUpdateUseCase_Execute_InvalidMemberRoleReturnsValidationError(t *testing.T) {
	teamRepo := new(mocks.TeamRepository)
	userRepo := new(mocks.UserRepository)
	txm := createTeamTxManager{repos: createTeamTxRepos{teamRepo: teamRepo, userRepo: userRepo}}
	uc := NewUpdateUseCase(teamRepo, userRepo, txm, testutil.NewDiscardLogger())

	tenantID := fixtures.NewTestTenantID()
	existing := fixtures.NewTeam()
	existing.Name = "Team"
	teamRepo.On("GetByID", mock.Anything, existing.ID, tenantID.UUID()).Return(existing, nil)

	_, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID,
		ID:             existing.ID,
		Name:           "Team",
		Color:          "neutral",
		Status:         "active",
		Members:        []MemberInput{{UserID: uuid.New(), RoleInTeam: "owner"}},
	})

	assert.ErrorIs(t, err, domain.ErrValidation)
	userRepo.AssertNotCalled(t, "GetByIDForOrganization", mock.Anything, mock.Anything, mock.Anything)
}

func TestUpdateUseCase_Execute_UserNotFoundReturnsValidationError(t *testing.T) {
	teamRepo := new(mocks.TeamRepository)
	userRepo := new(mocks.UserRepository)
	txm := createTeamTxManager{repos: createTeamTxRepos{teamRepo: teamRepo, userRepo: userRepo}}
	uc := NewUpdateUseCase(teamRepo, userRepo, txm, testutil.NewDiscardLogger())

	tenantID := fixtures.NewTestTenantID()
	existing := fixtures.NewTeam()
	existing.Name = "Team"
	userID := uuid.New()
	teamRepo.On("GetByID", mock.Anything, existing.ID, tenantID.UUID()).Return(existing, nil)
	userRepo.On("GetByIDForOrganization", mock.Anything, userID, tenantID.UUID()).Return(nil, domainuser.ErrNotFound)

	_, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID,
		ID:             existing.ID,
		Name:           "Team",
		Color:          "neutral",
		Status:         "active",
		Members:        []MemberInput{{UserID: userID, RoleInTeam: "leader"}},
	})

	assert.ErrorIs(t, err, domain.ErrValidation)
}

func TestUpdateUseCase_Execute_PropagatesRepositoryError(t *testing.T) {
	teamRepo := new(mocks.TeamRepository)
	userRepo := new(mocks.UserRepository)
	txm := createTeamTxManager{repos: createTeamTxRepos{teamRepo: teamRepo, userRepo: userRepo}}
	uc := NewUpdateUseCase(teamRepo, userRepo, txm, testutil.NewDiscardLogger())

	tenantID := fixtures.NewTestTenantID()
	expectedErr := errors.New("database failed")
	teamID := uuid.New()
	teamRepo.On("GetByID", mock.Anything, teamID, tenantID.UUID()).Return(nil, expectedErr)

	_, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID,
		ID:             teamID,
		Name:           "Team",
		Color:          "neutral",
		Status:         "active",
	})

	assert.ErrorIs(t, err, expectedErr)
}
