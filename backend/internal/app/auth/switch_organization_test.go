package auth

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domainauth "github.com/getbud-co/bud2/backend/internal/domain/auth"
	org "github.com/getbud-co/bud2/backend/internal/domain/organization"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func newSwitchOrgUC(
	users *mocks.UserRepository,
	organizations *mocks.OrganizationRepository,
	issuer *mocks.TokenIssuer,
	rtRepo *mocks.RefreshTokenRepository,
	tokenHasher *mocks.TokenHasher,
) *SwitchOrganizationUseCase {
	return NewSwitchOrganizationUseCase(
		users,
		organizations,
		issuer,
		new(mocks.PasswordHasher),
		rtRepo,
		tokenHasher,
		testutil.NewDiscardLogger(),
		8*time.Hour, 7*24*time.Hour,
	)
}

func TestSwitchOrganizationUseCase_Execute_SwitchesAccessibleOrganization(t *testing.T) {
	users := new(mocks.UserRepository)
	organizations := new(mocks.OrganizationRepository)
	issuer := new(mocks.TokenIssuer)
	rtRepo := new(mocks.RefreshTokenRepository)
	tokenHasher := new(mocks.TokenHasher)
	uc := newSwitchOrgUC(users, organizations, issuer, rtRepo, tokenHasher)

	orgA := fixtures.NewOrganization()
	orgB := fixtures.NewOrganizationWithName("Second Org", "second")
	orgB.ID = uuid.New()
	orgB.Domain = "second.example.com"

	u := fixtures.NewUserWithMembership()
	u.Email = "member@alpha.example.com"
	u.Memberships[0].OrganizationID = orgA.ID
	u.Memberships = append(u.Memberships, *fixtures.NewMembership())
	u.Memberships[1].OrganizationID = orgB.ID
	u.Memberships[1].Role = "manager"

	users.On("GetByID", mock.Anything, u.ID).Return(u, nil)
	organizations.On("GetByID", mock.Anything, orgA.ID).Return(orgA, nil)
	organizations.On("GetByID", mock.Anything, orgB.ID).Return(orgB, nil)
	issuer.On("IssueToken", mock.MatchedBy(func(claims domain.UserClaims) bool {
		return claims.HasActiveOrganization && claims.ActiveOrganizationID.UUID() == orgB.ID && claims.MembershipRole == "manager"
	}), 8*time.Hour).Return("new-access-token", nil)
	tokenHasher.On("Hash", mock.AnythingOfType("string")).Return("hashed-token")
	rtRepo.On("Create", mock.Anything, mock.MatchedBy(func(token *domainauth.RefreshToken) bool {
		return token.UserID == u.ID && token.ActiveOrganizationID != nil && *token.ActiveOrganizationID == orgB.ID
	})).Return(&domainauth.RefreshToken{ID: uuid.New(), UserID: u.ID, TokenHash: "hashed-token", ExpiresAt: time.Now().Add(7 * 24 * time.Hour)}, nil)

	result, err := uc.Execute(context.Background(), domain.UserClaims{UserID: domain.UserID(u.ID)}, SwitchOrganizationCommand{OrganizationID: orgB.ID})

	require.NoError(t, err)
	require.NotNil(t, result.Session.ActiveOrganization)
	assert.Equal(t, orgB.ID, result.Session.ActiveOrganization.ID)
	assert.Equal(t, "new-access-token", result.Token)
	assert.NotEmpty(t, result.RefreshToken)
}

func TestSwitchOrganizationUseCase_Execute_ReturnsNoOrganizationsForInaccessibleOrganization(t *testing.T) {
	users := new(mocks.UserRepository)
	organizations := new(mocks.OrganizationRepository)
	uc := newSwitchOrgUC(users, organizations, new(mocks.TokenIssuer), new(mocks.RefreshTokenRepository), new(mocks.TokenHasher))

	orgA := fixtures.NewOrganization()
	targetOrgID := uuid.New()
	u := fixtures.NewUserWithMembership()
	u.Memberships[0].OrganizationID = orgA.ID

	users.On("GetByID", mock.Anything, u.ID).Return(u, nil)
	organizations.On("GetByID", mock.Anything, orgA.ID).Return(orgA, nil)

	result, err := uc.Execute(context.Background(), domain.UserClaims{UserID: domain.UserID(u.ID)}, SwitchOrganizationCommand{OrganizationID: targetOrgID})

	assert.ErrorIs(t, err, ErrNoOrganizations)
	assert.Nil(t, result)
}

func TestSwitchOrganizationUseCase_Execute_SystemAdminCanSwitchToAnyOrganization(t *testing.T) {
	users := new(mocks.UserRepository)
	organizations := new(mocks.OrganizationRepository)
	issuer := new(mocks.TokenIssuer)
	rtRepo := new(mocks.RefreshTokenRepository)
	tokenHasher := new(mocks.TokenHasher)
	uc := newSwitchOrgUC(users, organizations, issuer, rtRepo, tokenHasher)

	orgA := fixtures.NewOrganization()
	orgB := fixtures.NewOrganizationWithName("Second Org", "second")
	orgB.ID = uuid.New()
	orgB.Domain = "second.example.com"

	u := fixtures.NewSystemAdmin()
	users.On("GetByID", mock.Anything, u.ID).Return(u, nil)
	organizations.On("List", mock.Anything, org.ListFilter{Page: 1, Size: 1000}).Return(org.ListResult{
		Organizations: []org.Organization{*orgA},
		Total:         1,
	}, nil)
	organizations.On("GetByID", mock.Anything, orgB.ID).Return(orgB, nil)
	issuer.On("IssueToken", mock.MatchedBy(func(claims domain.UserClaims) bool {
		return claims.IsSystemAdmin && claims.HasActiveOrganization && claims.ActiveOrganizationID.UUID() == orgB.ID
	}), 8*time.Hour).Return("new-access-token", nil)
	tokenHasher.On("Hash", mock.AnythingOfType("string")).Return("hashed-token")
	rtRepo.On("Create", mock.Anything, mock.MatchedBy(func(token *domainauth.RefreshToken) bool {
		return token.ActiveOrganizationID != nil && *token.ActiveOrganizationID == orgB.ID
	})).Return(&domainauth.RefreshToken{ID: uuid.New(), UserID: u.ID, TokenHash: "hashed-token", ExpiresAt: time.Now().Add(7 * 24 * time.Hour)}, nil)

	result, err := uc.Execute(context.Background(), domain.UserClaims{UserID: domain.UserID(u.ID), IsSystemAdmin: true}, SwitchOrganizationCommand{OrganizationID: orgB.ID})

	require.NoError(t, err)
	require.NotNil(t, result.Session.ActiveOrganization)
	assert.Equal(t, orgB.ID, result.Session.ActiveOrganization.ID)
	assert.Len(t, result.Session.Organizations, 2)
}
