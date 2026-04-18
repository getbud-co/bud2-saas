package fixtures

import (
	"context"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
)

func NewContext() context.Context {
	return context.Background()
}

func NewContextWithTenant(tenantID domain.TenantID) context.Context {
	ctx := NewContext()
	return domain.TenantIDToContext(ctx, tenantID)
}

func NewContextWithUserClaims(claims domain.UserClaims) context.Context {
	ctx := NewContext()
	ctx = domain.ClaimsToContext(ctx, claims)
	if claims.HasActiveOrganization {
		ctx = domain.TenantIDToContext(ctx, claims.ActiveOrganizationID)
	}
	return ctx
}

func NewTestTenantID() domain.TenantID {
	return domain.TenantID(uuid.MustParse("550e8400-e29b-41d4-a716-446655440000"))
}

func NewTestUserClaims() domain.UserClaims {
	return domain.UserClaims{
		UserID:                domain.UserID(uuid.MustParse("660e8400-e29b-41d4-a716-446655440000")),
		ActiveOrganizationID:  NewTestTenantID(),
		HasActiveOrganization: true,
		MembershipRole:        "admin",
	}
}

func NewContextWithAdminUser() context.Context {
	return NewContextWithUserClaims(NewTestUserClaims())
}
