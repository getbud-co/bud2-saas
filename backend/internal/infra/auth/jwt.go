package auth

import (
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/getbud-co/bud2/backend/internal/domain"
)

type TokenIssuer struct {
	secret string
}

func NewTokenIssuer(secret string) *TokenIssuer {
	return &TokenIssuer{secret: secret}
}

func (ti *TokenIssuer) IssueToken(claims domain.UserClaims, ttl time.Duration) (string, error) {
	now := time.Now().UTC()
	mapClaims := jwt.MapClaims{
		"user_id":         claims.UserID.String(),
		"membership_role": claims.MembershipRole,
		"is_system_admin": claims.IsSystemAdmin,
		"iat":             now.Unix(),
		"exp":             now.Add(ttl).Unix(),
	}
	if claims.HasActiveOrganization {
		mapClaims["active_organization_id"] = claims.ActiveOrganizationID.String()
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, mapClaims)

	return token.SignedString([]byte(ti.secret))
}
