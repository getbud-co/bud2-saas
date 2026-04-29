package tag

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	domaintag "github.com/getbud-co/bud2/backend/internal/domain/tag"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func TestCreateUseCase_Execute_Success(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	created := &domaintag.Tag{ID: uuid.New(), Name: "Engineering", Color: domaintag.ColorOrange}

	repo := new(mocks.TagRepository)
	repo.On("GetByName", mock.Anything, tenantID.UUID(), "Engineering").Return(nil, domaintag.ErrNotFound)
	repo.On("Create", mock.Anything, mock.MatchedBy(func(tag *domaintag.Tag) bool {
		return tag.Name == "Engineering" && tag.Color == domaintag.ColorOrange
	})).Return(created, nil)

	uc := NewCreateUseCase(repo, testutil.NewDiscardLogger())
	result, err := uc.Execute(context.Background(), CreateCommand{
		OrganizationID: tenantID,
		Name:           "Engineering",
		Color:          "orange",
	})

	require.NoError(t, err)
	assert.Equal(t, created, result)
	repo.AssertExpectations(t)
}

func TestCreateUseCase_Execute_DuplicateName_ReturnsConflict(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	repo := new(mocks.TagRepository)
	repo.On("GetByName", mock.Anything, tenantID.UUID(), "Engineering").Return(&domaintag.Tag{ID: uuid.New()}, nil)

	uc := NewCreateUseCase(repo, testutil.NewDiscardLogger())
	_, err := uc.Execute(context.Background(), CreateCommand{
		OrganizationID: tenantID,
		Name:           "Engineering",
		Color:          "orange",
	})

	assert.ErrorIs(t, err, domaintag.ErrNameExists)
	repo.AssertNotCalled(t, "Create")
}

func TestCreateUseCase_Execute_GetByNameError_Propagated(t *testing.T) {
	repoErr := errors.New("db down")
	repo := new(mocks.TagRepository)
	repo.On("GetByName", mock.Anything, mock.Anything, mock.Anything).Return(nil, repoErr)

	uc := NewCreateUseCase(repo, testutil.NewDiscardLogger())
	_, err := uc.Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		Name:           "x",
		Color:          "neutral",
	})

	assert.ErrorIs(t, err, repoErr)
}

func TestCreateUseCase_Execute_InvalidColor_ReturnsValidationError(t *testing.T) {
	repo := new(mocks.TagRepository)
	repo.On("GetByName", mock.Anything, mock.Anything, mock.Anything).Return(nil, domaintag.ErrNotFound)

	uc := NewCreateUseCase(repo, testutil.NewDiscardLogger())
	_, err := uc.Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		Name:           "valid",
		Color:          "purple",
	})

	assert.Error(t, err)
	repo.AssertNotCalled(t, "Create")
}
