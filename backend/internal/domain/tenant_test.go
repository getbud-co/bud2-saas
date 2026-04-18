package domain

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTenantID_Context(t *testing.T) {
	tenantID := TenantID(uuid.New())
	ctx := context.Background()

	// Test injection
	ctx = TenantIDToContext(ctx, tenantID)

	// Test extraction
	extracted, err := TenantIDFromContext(ctx)
	require.NoError(t, err)
	assert.Equal(t, tenantID, extracted)
}

func TestTenantIDFromContext_NotFound(t *testing.T) {
	ctx := context.Background()
	_, err := TenantIDFromContext(ctx)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "tenant_id not found")
}

func TestTenantID_UUID(t *testing.T) {
	id := uuid.New()
	tenantID := TenantID(id)
	assert.Equal(t, id, tenantID.UUID())
}

func TestTenantID_String(t *testing.T) {
	id := uuid.New()
	tenantID := TenantID(id)
	assert.Equal(t, id.String(), tenantID.String())
}

func TestClaims_Context(t *testing.T) {
	claims := UserClaims{
		UserID:                UserID(uuid.New()),
		ActiveOrganizationID:  TenantID(uuid.New()),
		HasActiveOrganization: true,
		MembershipRole:        "admin",
		IsSystemAdmin:         false,
	}
	ctx := context.Background()

	// Test injection
	ctx = ClaimsToContext(ctx, claims)

	// Test extraction
	extracted, err := ClaimsFromContext(ctx)
	require.NoError(t, err)
	assert.Equal(t, claims, extracted)
}

func TestClaimsFromContext_NotFound(t *testing.T) {
	ctx := context.Background()
	_, err := ClaimsFromContext(ctx)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "user claims not found")
}

func TestUserID_UUID(t *testing.T) {
	id := uuid.New()
	userID := UserID(id)
	assert.Equal(t, id, userID.UUID())
}

func TestUserID_String(t *testing.T) {
	id := uuid.New()
	userID := UserID(id)
	assert.Equal(t, id.String(), userID.String())
}
