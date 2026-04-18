package domain

import (
	"context"
	"errors"

	"github.com/google/uuid"
)

type UserID uuid.UUID

func (u UserID) UUID() uuid.UUID { return uuid.UUID(u) }
func (u UserID) String() string  { return uuid.UUID(u).String() }

type UserClaims struct {
	UserID                UserID
	ActiveOrganizationID  TenantID
	HasActiveOrganization bool
	MembershipRole        string
	IsSystemAdmin         bool
}

type claimsContextKey string

const userClaimsKey claimsContextKey = "user_claims"

func ClaimsToContext(ctx context.Context, claims UserClaims) context.Context {
	return context.WithValue(ctx, userClaimsKey, claims)
}

func ClaimsFromContext(ctx context.Context) (UserClaims, error) {
	v, ok := ctx.Value(userClaimsKey).(UserClaims)
	if !ok {
		return UserClaims{}, errors.New("user claims not found in context")
	}
	return v, nil
}
