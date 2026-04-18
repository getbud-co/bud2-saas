package domain

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

func TestClaimsFromContext_WrongType(t *testing.T) {
	ctx := context.WithValue(context.Background(), userClaimsKey, "not a UserClaims")
	_, err := ClaimsFromContext(ctx)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "user claims not found")
}

func TestUserClaims_Equality(t *testing.T) {
	userID := UserID(uuid.New())
	orgID := TenantID(uuid.New())
	claims1 := UserClaims{UserID: userID, ActiveOrganizationID: orgID, HasActiveOrganization: true, MembershipRole: "admin"}
	claims2 := UserClaims{UserID: userID, ActiveOrganizationID: orgID, HasActiveOrganization: true, MembershipRole: "admin"}
	assert.Equal(t, claims1, claims2)
}

func TestUserClaims_DifferentValues(t *testing.T) {
	claims1 := UserClaims{UserID: UserID(uuid.New()), ActiveOrganizationID: TenantID(uuid.New()), HasActiveOrganization: true, MembershipRole: "admin"}
	claims2 := UserClaims{UserID: UserID(uuid.New()), MembershipRole: "manager", IsSystemAdmin: true}
	assert.NotEqual(t, claims1, claims2)
}
