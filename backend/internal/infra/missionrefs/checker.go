// Package missionrefs adapts existing domain repositories to the
// app/mission.ReferenceChecker interface, enforcing tenant scope on every
// cross-resource lookup that mission use cases perform.
package missionrefs

import (
	"context"
	"errors"

	"github.com/google/uuid"

	domaincycle "github.com/getbud-co/bud2/backend/internal/domain/cycle"
	domainmission "github.com/getbud-co/bud2/backend/internal/domain/mission"
	domainteam "github.com/getbud-co/bud2/backend/internal/domain/team"
	domainuser "github.com/getbud-co/bud2/backend/internal/domain/user"
)

// userOrgChecker is the subset of user.Repository we need.
type userOrgChecker interface {
	GetByIDForOrganization(ctx context.Context, id, organizationID uuid.UUID) (*domainuser.User, error)
}

type Checker struct {
	cycles domaincycle.Repository
	teams  domainteam.Repository
	users  userOrgChecker
}

func New(cycles domaincycle.Repository, teams domainteam.Repository, users userOrgChecker) *Checker {
	return &Checker{cycles: cycles, teams: teams, users: users}
}

func (c *Checker) CheckCycleInOrg(ctx context.Context, cycleID, organizationID uuid.UUID) error {
	if _, err := c.cycles.GetByID(ctx, cycleID, organizationID); err != nil {
		if errors.Is(err, domaincycle.ErrNotFound) {
			return domainmission.ErrInvalidReference
		}
		return err
	}
	return nil
}

func (c *Checker) CheckTeamInOrg(ctx context.Context, teamID, organizationID uuid.UUID) error {
	if _, err := c.teams.GetByID(ctx, teamID, organizationID); err != nil {
		if errors.Is(err, domainteam.ErrNotFound) {
			return domainmission.ErrInvalidReference
		}
		return err
	}
	return nil
}

func (c *Checker) CheckUserInOrg(ctx context.Context, userID, organizationID uuid.UUID) error {
	if _, err := c.users.GetByIDForOrganization(ctx, userID, organizationID); err != nil {
		if errors.Is(err, domainuser.ErrNotFound) {
			return domainmission.ErrInvalidReference
		}
		return err
	}
	return nil
}
