package user

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"

	"github.com/getbud-co/bud2/backend/internal/domain/membership"
	usr "github.com/getbud-co/bud2/backend/internal/domain/user"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func TestGetUseCase_Execute_Success(t *testing.T) {
	users := new(mocks.UserRepository)
	uc := NewGetUseCase(users, testutil.NewDiscardLogger())

	tenantID := fixtures.NewTestTenantID()
	testUser := fixtures.NewUserWithMembership()
	testMembership := &testUser.Memberships[0]
	testMembership.OrganizationID = tenantID.UUID()

	users.On("GetByID", t.Context(), testUser.ID).Return(testUser, nil)

	result, err := uc.Execute(t.Context(), tenantID, testUser.ID)

	assert.NoError(t, err)
	assert.Equal(t, testUser.Email, result.Email)
}

func TestGetUseCase_Execute_MembershipNotFound(t *testing.T) {
	users := new(mocks.UserRepository)
	uc := NewGetUseCase(users, testutil.NewDiscardLogger())

	tenantID := fixtures.NewTestTenantID()
	userID := uuid.New()
	testUser := fixtures.NewUser()
	testUser.ID = userID

	users.On("GetByID", t.Context(), userID).Return(testUser, nil)

	result, err := uc.Execute(t.Context(), tenantID, userID)

	assert.ErrorIs(t, err, membership.ErrNotFound)
	assert.Nil(t, result)
}

func TestGetUseCase_Execute_UserNotFound(t *testing.T) {
	users := new(mocks.UserRepository)
	uc := NewGetUseCase(users, testutil.NewDiscardLogger())

	userID := uuid.New()

	users.On("GetByID", t.Context(), userID).Return(nil, usr.ErrNotFound)

	result, err := uc.Execute(t.Context(), fixtures.NewTestTenantID(), userID)

	assert.ErrorIs(t, err, usr.ErrNotFound)
	assert.Nil(t, result)
}
