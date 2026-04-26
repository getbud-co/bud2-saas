package mission

import (
	"context"

	"github.com/google/uuid"
)

// ReferenceChecker validates that cycle/team/owner referenced by a mission
// belong to the active organization. Implementations live in infrastructure
// (one method per upstream repo) and are wired in cmd/api/main.go.
//
// Each method returns:
//   - nil: reference exists in the org
//   - domainmission.ErrInvalidReference: reference missing or in another org
//   - any other error: real failure (DB down, etc.) — propagate as 500
type ReferenceChecker interface {
	CheckCycleInOrg(ctx context.Context, cycleID, organizationID uuid.UUID) error
	CheckTeamInOrg(ctx context.Context, teamID, organizationID uuid.UUID) error
	CheckUserInOrg(ctx context.Context, userID, organizationID uuid.UUID) error
}
