package mission

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	domainmission "github.com/getbud-co/bud2/backend/internal/domain/mission"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func TestGetUseCase_Execute_Success_ReturnsMission(t *testing.T) {
	id := uuid.New()
	tenantID := fixtures.NewTestTenantID()
	expected := &domainmission.Mission{ID: id, OrganizationID: tenantID.UUID(), Title: "x"}
	repo := new(mocks.MissionRepository)
	repo.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(expected, nil)

	uc := NewGetUseCase(repo, testutil.NewDiscardLogger())
	m, err := uc.Execute(context.Background(), tenantID, id)

	require.NoError(t, err)
	assert.Equal(t, expected, m)
	repo.AssertExpectations(t)
}

func TestGetUseCase_Execute_NotFound_PropagatesError(t *testing.T) {
	repo := new(mocks.MissionRepository)
	repo.On("GetByID", mock.Anything, mock.Anything, mock.Anything).Return(nil, domainmission.ErrNotFound)

	uc := NewGetUseCase(repo, testutil.NewDiscardLogger())
	_, err := uc.Execute(context.Background(), fixtures.NewTestTenantID(), uuid.New())

	assert.ErrorIs(t, err, domainmission.ErrNotFound)
}
