package missionrefs

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	domainmission "github.com/getbud-co/bud2/backend/internal/domain/mission"
	domainorg "github.com/getbud-co/bud2/backend/internal/domain/organization"
	domainuser "github.com/getbud-co/bud2/backend/internal/domain/user"
)

// fakeUserChecker stubs the userOrgChecker interface for unit tests.
type fakeUserChecker struct {
	user *domainuser.User
	err  error
}

func (f fakeUserChecker) GetByIDForOrganization(_ context.Context, _, _ uuid.UUID) (*domainuser.User, error) {
	return f.user, f.err
}

func newCheckerWithUser(u *domainuser.User, err error) *Checker {
	return &Checker{users: fakeUserChecker{user: u, err: err}}
}

func TestCheckUserInOrg_UserNotFound_ReturnsInvalidReference(t *testing.T) {
	c := newCheckerWithUser(nil, domainuser.ErrNotFound)

	err := c.CheckUserInOrg(context.Background(), uuid.New(), uuid.New())

	assert.ErrorIs(t, err, domainmission.ErrInvalidReference)
}

func TestCheckUserInOrg_MembershipNotFound_ReturnsInvalidReference(t *testing.T) {
	// Caminho real cross-tenant: o user existe mas não tem membership na org alvo.
	// GetByIDForOrganization sinaliza com ErrMembershipNotFound.
	c := newCheckerWithUser(nil, domainorg.ErrMembershipNotFound)

	err := c.CheckUserInOrg(context.Background(), uuid.New(), uuid.New())

	assert.ErrorIs(t, err, domainmission.ErrInvalidReference, "cross-tenant owner must surface as 422 (InvalidReference), not 500")
}

func TestCheckUserInOrg_GenericError_Propagates(t *testing.T) {
	dbErr := errors.New("connection reset")
	c := newCheckerWithUser(nil, dbErr)

	err := c.CheckUserInOrg(context.Background(), uuid.New(), uuid.New())

	assert.ErrorIs(t, err, dbErr)
	assert.NotErrorIs(t, err, domainmission.ErrInvalidReference, "real DB errors must NOT be remapped to InvalidReference")
}

func TestCheckUserInOrg_ActiveMembership_ReturnsNil(t *testing.T) {
	orgID := uuid.New()
	user := &domainuser.User{
		ID: uuid.New(),
		Memberships: []domainorg.Membership{{
			OrganizationID: orgID,
			Status:         domainorg.MembershipStatusActive,
		}},
	}
	c := newCheckerWithUser(user, nil)

	err := c.CheckUserInOrg(context.Background(), user.ID, orgID)

	assert.NoError(t, err)
}

func TestCheckUserInOrg_InactiveMembership_ReturnsInvalidReference(t *testing.T) {
	orgID := uuid.New()
	user := &domainuser.User{
		ID: uuid.New(),
		Memberships: []domainorg.Membership{{
			OrganizationID: orgID,
			Status:         domainorg.MembershipStatusInactive,
		}},
	}
	c := newCheckerWithUser(user, nil)

	err := c.CheckUserInOrg(context.Background(), user.ID, orgID)

	assert.ErrorIs(t, err, domainmission.ErrInvalidReference, "inactive members must not be assignable as owners")
}

func TestCheckUserInOrg_InvitedMembership_ReturnsInvalidReference(t *testing.T) {
	orgID := uuid.New()
	user := &domainuser.User{
		ID: uuid.New(),
		Memberships: []domainorg.Membership{{
			OrganizationID: orgID,
			Status:         domainorg.MembershipStatusInvited,
		}},
	}
	c := newCheckerWithUser(user, nil)

	err := c.CheckUserInOrg(context.Background(), user.ID, orgID)

	assert.ErrorIs(t, err, domainmission.ErrInvalidReference, "invited (not yet accepted) members must not be assignable as owners")

	// Sanity: ensure the user really has the membership at all (otherwise
	// ActiveMembershipForOrganization returning ErrMembershipNotFound would
	// pass the same assert for the wrong reason).
	_, err = user.MembershipForOrganization(orgID)
	require.NoError(t, err)
}
