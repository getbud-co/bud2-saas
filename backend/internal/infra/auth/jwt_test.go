package auth

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/getbud-co/bud2/backend/internal/domain"
)

func TestTokenIssuer_IssueToken_WithActiveOrganization(t *testing.T) {
	issuer := NewTokenIssuer("test-secret")
	claims := domain.UserClaims{
		UserID:                domain.UserID(uuid.New()),
		ActiveOrganizationID:  domain.TenantID(uuid.New()),
		HasActiveOrganization: true,
		MembershipRole:        "admin",
		IsSystemAdmin:         false,
	}

	tokenString, err := issuer.IssueToken(claims, time.Hour)
	require.NoError(t, err)

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return []byte("test-secret"), nil
	})
	require.NoError(t, err)
	mapClaims := token.Claims.(jwt.MapClaims)
	assert.Equal(t, claims.UserID.String(), mapClaims["user_id"])
	assert.Equal(t, claims.ActiveOrganizationID.String(), mapClaims["active_organization_id"])
	assert.Equal(t, claims.MembershipRole, mapClaims["membership_role"])
	assert.Equal(t, claims.IsSystemAdmin, mapClaims["is_system_admin"])
}

func TestTokenIssuer_IssueToken_WithoutActiveOrganization(t *testing.T) {
	issuer := NewTokenIssuer("test-secret")
	claims := domain.UserClaims{UserID: domain.UserID(uuid.New()), IsSystemAdmin: true}

	tokenString, err := issuer.IssueToken(claims, time.Hour)
	require.NoError(t, err)

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return []byte("test-secret"), nil
	})
	require.NoError(t, err)
	mapClaims := token.Claims.(jwt.MapClaims)
	_, hasActiveOrganization := mapClaims["active_organization_id"]
	assert.False(t, hasActiveOrganization)
	assert.Equal(t, true, mapClaims["is_system_admin"])
}
