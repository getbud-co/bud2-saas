package organization

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	org "github.com/getbud-co/bud2/backend/internal/domain/organization"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func TestGetUseCase_Execute_Success(t *testing.T) {
	repo := new(mocks.OrganizationRepository)
	uc := NewGetUseCase(repo, testutil.NewDiscardLogger())

	expected := fixtures.NewOrganization()
	userID := uuid.New()
	repo.On("GetByIDForUser", mock.Anything, userID, expected.ID).Return(expected, nil)

	result, err := uc.Execute(context.Background(), GetCommand{RequesterUserID: userID, ID: expected.ID})

	assert.NoError(t, err)
	assert.Equal(t, expected, result)
}

func TestGetUseCase_Execute_NotFound(t *testing.T) {
	repo := new(mocks.OrganizationRepository)
	uc := NewGetUseCase(repo, testutil.NewDiscardLogger())

	id := uuid.New()
	userID := uuid.New()
	repo.On("GetByIDForUser", mock.Anything, userID, id).Return(nil, org.ErrNotFound)

	result, err := uc.Execute(context.Background(), GetCommand{RequesterUserID: userID, ID: id})

	assert.ErrorIs(t, err, org.ErrNotFound)
	assert.Nil(t, result)
}

func TestGetUseCase_Execute_SystemAdminUsesGlobalLookup(t *testing.T) {
	repo := new(mocks.OrganizationRepository)
	uc := NewGetUseCase(repo, testutil.NewDiscardLogger())

	expected := fixtures.NewOrganization()
	repo.On("GetByID", mock.Anything, expected.ID).Return(expected, nil)

	result, err := uc.Execute(context.Background(), GetCommand{RequesterIsSystemAdmin: true, ID: expected.ID})

	assert.NoError(t, err)
	assert.Equal(t, expected, result)
}
