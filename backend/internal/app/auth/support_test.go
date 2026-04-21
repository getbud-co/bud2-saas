package auth

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	domainauth "github.com/getbud-co/bud2/backend/internal/domain/auth"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func TestAuthSupport_IssueRefreshToken_PersistsActiveOrganization(t *testing.T) {
	rtRepo := new(mocks.RefreshTokenRepository)
	tokenHasher := new(mocks.TokenHasher)
	support := authSupport{
		refreshTokenRepo: rtRepo,
		tokenHasher:      tokenHasher,
		refreshTokenTTL:  7 * 24 * time.Hour,
		logger:           testutil.NewDiscardLogger(),
	}

	userID := uuid.New()
	orgID := uuid.New()
	tokenHasher.On("Hash", mock.AnythingOfType("string")).Return("hashed-token")
	rtRepo.On("Create", mock.Anything, mock.MatchedBy(func(token *domainauth.RefreshToken) bool {
		return token.UserID == userID && token.ActiveOrganizationID != nil && *token.ActiveOrganizationID == orgID && token.TokenHash == "hashed-token"
	})).Return(&domainauth.RefreshToken{ID: uuid.New(), UserID: userID, TokenHash: "hashed-token", ExpiresAt: time.Now().Add(7 * 24 * time.Hour)}, nil)

	rawToken, err := support.issueRefreshToken(context.Background(), userID, &orgID)

	require.NoError(t, err)
	assert.NotEmpty(t, rawToken)
	rtRepo.AssertExpectations(t)
}

func TestChooseActiveOrganization_PrefersEmailDomainMatch(t *testing.T) {
	orgA := AccessibleOrganization{ID: uuid.New(), Domain: "alpha.example.com"}
	orgB := AccessibleOrganization{ID: uuid.New(), Domain: "beta.example.com"}

	active := chooseActiveOrganization("member@beta.example.com", []AccessibleOrganization{orgA, orgB})

	require.NotNil(t, active)
	assert.Equal(t, orgB.ID, active.ID)
}

func TestChooseActiveOrganization_FallsBackToFirstOrganization(t *testing.T) {
	orgA := AccessibleOrganization{ID: uuid.New(), Domain: "alpha.example.com"}
	orgB := AccessibleOrganization{ID: uuid.New(), Domain: "beta.example.com"}

	active := chooseActiveOrganization("member@unknown.example.com", []AccessibleOrganization{orgA, orgB})

	require.NotNil(t, active)
	assert.Equal(t, orgA.ID, active.ID)
}

func TestEmailDomain_TrimsAndLowercases(t *testing.T) {
	assert.Equal(t, "example.com", emailDomain("  USER@Example.com  "))
	assert.Empty(t, emailDomain("invalid-email"))
}
