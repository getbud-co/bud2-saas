package tag

import (
	"context"
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

func TestUpdateUseCase_Execute_Success(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	id := uuid.New()
	existing := &domaintag.Tag{ID: id, OrganizationID: tenantID.UUID(), Name: "Engineering", Color: domaintag.ColorOrange}
	updated := &domaintag.Tag{ID: id, OrganizationID: tenantID.UUID(), Name: "Engineering", Color: domaintag.ColorWine}

	repo := new(mocks.TagRepository)
	repo.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(existing, nil)
	repo.On("Update", mock.Anything, mock.MatchedBy(func(t *domaintag.Tag) bool {
		return t.Color == domaintag.ColorWine
	})).Return(updated, nil)

	uc := NewUpdateUseCase(repo, testutil.NewDiscardLogger())
	result, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID,
		ID:             id,
		Name:           "Engineering",
		Color:          "wine",
	})

	require.NoError(t, err)
	assert.Equal(t, updated, result)
}

func TestUpdateUseCase_Execute_DuplicateName_ReturnsConflict(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	id := uuid.New()
	existing := &domaintag.Tag{ID: id, OrganizationID: tenantID.UUID(), Name: "Engineering", Color: domaintag.ColorOrange}

	repo := new(mocks.TagRepository)
	repo.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(existing, nil)
	repo.On("GetByName", mock.Anything, tenantID.UUID(), "Design").Return(&domaintag.Tag{ID: uuid.New()}, nil)

	uc := NewUpdateUseCase(repo, testutil.NewDiscardLogger())
	_, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID,
		ID:             id,
		Name:           "Design",
		Color:          "orange",
	})

	assert.ErrorIs(t, err, domaintag.ErrNameExists)
}

func TestUpdateUseCase_Execute_NotFound_ReturnsError(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	id := uuid.New()

	repo := new(mocks.TagRepository)
	repo.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(nil, domaintag.ErrNotFound)

	uc := NewUpdateUseCase(repo, testutil.NewDiscardLogger())
	_, err := uc.Execute(context.Background(), UpdateCommand{
		OrganizationID: tenantID,
		ID:             id,
		Name:           "Engineering",
		Color:          "orange",
	})

	assert.ErrorIs(t, err, domaintag.ErrNotFound)
}
