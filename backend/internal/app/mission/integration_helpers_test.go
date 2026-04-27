//go:build integration

package mission

import (
	"github.com/google/uuid"

	domaintask "github.com/getbud-co/bud2/backend/internal/domain/task"
)

// Small helpers to build task list filters from inside the mission package
// without importing postgres-internal types. Keeps the integration test
// readable.

func postgresTaskListFilter(orgID, missionID uuid.UUID) domaintask.ListFilter {
	return domaintask.ListFilter{OrganizationID: orgID, MissionID: &missionID}
}

func postgresTaskListFilterAll(orgID uuid.UUID) domaintask.ListFilter {
	return domaintask.ListFilter{OrganizationID: orgID}
}
