package user

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/getbud-co/bud2/backend/internal/domain"
	"github.com/getbud-co/bud2/backend/internal/domain/organization"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func TestGetMembershipUseCase_Execute_Success(t *testing.T) {
	users := new(mocks.UserRepository)
	uc := NewGetMembershipUseCase(users, testutil.NewDiscardLogger())

	u := fixtures.NewUserWithMembership()
	organizationID := domain.TenantID(u.Memberships[0].OrganizationID)
	users.On("GetByIDForOrganization", mock.Anything, u.ID, organizationID.UUID()).Return(u, nil)

	result, err := uc.Execute(context.Background(), organizationID, u.ID)

	require.NoError(t, err)
	assert.Equal(t, u.Memberships[0].ID, result.ID)
}

func TestGetMembershipUseCase_Execute_NotFoundForOrganization(t *testing.T) {
	users := new(mocks.UserRepository)
	uc := NewGetMembershipUseCase(users, testutil.NewDiscardLogger())

	u := fixtures.NewUserWithMembership()
	otherOrgID := domain.TenantID(uuid.New())
	users.On("GetByIDForOrganization", mock.Anything, u.ID, otherOrgID.UUID()).Return(nil, organization.ErrMembershipNotFound)

	result, err := uc.Execute(context.Background(), otherOrgID, u.ID)

	assert.ErrorIs(t, err, organization.ErrMembershipNotFound)
	assert.Nil(t, result)
}
