package domain

import (
	"context"
	"errors"

	"github.com/google/uuid"
)

// TenantID is the named value object for multi-tenant row-level isolation.
// Extracted from JWT claims by auth middleware and propagated via Commands.
type TenantID uuid.UUID

func (t TenantID) UUID() uuid.UUID { return uuid.UUID(t) }
func (t TenantID) String() string  { return uuid.UUID(t).String() }

type contextKey string

const tenantIDKey contextKey = "tenant_id"

func TenantIDToContext(ctx context.Context, id TenantID) context.Context {
	return context.WithValue(ctx, tenantIDKey, id)
}

func TenantIDFromContext(ctx context.Context) (TenantID, error) {
	v, ok := ctx.Value(tenantIDKey).(TenantID)
	if !ok {
		return TenantID{}, errors.New("tenant_id not found in context")
	}
	return v, nil
}
