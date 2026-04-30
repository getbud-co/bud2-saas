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

func TestDeleteUseCase_Execute_Success(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	id := uuid.New()
	existing := &domaintag.Tag{ID: id, OrganizationID: tenantID.UUID(), Name: "Engineering"}

	repo := new(mocks.TagRepository)
	repo.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(existing, nil)
	repo.On("SoftDelete", mock.Anything, id, tenantID.UUID()).Return(nil)

	uc := NewDeleteUseCase(repo, testutil.NewDiscardLogger())
	err := uc.Execute(context.Background(), DeleteCommand{OrganizationID: tenantID, ID: id})

	require.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestDeleteUseCase_Execute_NotFound_ReturnsError(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	id := uuid.New()

	repo := new(mocks.TagRepository)
	repo.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(nil, domaintag.ErrNotFound)

	uc := NewDeleteUseCase(repo, testutil.NewDiscardLogger())
	err := uc.Execute(context.Background(), DeleteCommand{OrganizationID: tenantID, ID: id})

	assert.ErrorIs(t, err, domaintag.ErrNotFound)
}
