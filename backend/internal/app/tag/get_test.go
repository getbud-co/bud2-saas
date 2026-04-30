package tag

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	domaintag "github.com/getbud-co/bud2/backend/internal/domain/tag"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func TestGetUseCase_Execute_Success(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	id := uuid.New()
	expected := &domaintag.Tag{ID: id, OrganizationID: tenantID.UUID(), Name: "Engineering"}

	repo := new(mocks.TagRepository)
	repo.On("GetByID", context.Background(), id, tenantID.UUID()).Return(expected, nil)

	uc := NewGetUseCase(repo, testutil.NewDiscardLogger())
	result, err := uc.Execute(context.Background(), tenantID, id)

	require.NoError(t, err)
	assert.Equal(t, expected, result)
}

func TestGetUseCase_Execute_NotFound_ReturnsError(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	id := uuid.New()

	repo := new(mocks.TagRepository)
	repo.On("GetByID", context.Background(), id, tenantID.UUID()).Return(nil, domaintag.ErrNotFound)

	uc := NewGetUseCase(repo, testutil.NewDiscardLogger())
	_, err := uc.Execute(context.Background(), tenantID, id)

	assert.ErrorIs(t, err, domaintag.ErrNotFound)
}
