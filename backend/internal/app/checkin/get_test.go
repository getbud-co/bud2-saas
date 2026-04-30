package checkin_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	appcheckin "github.com/getbud-co/bud2/backend/internal/app/checkin"
	domaincheckin "github.com/getbud-co/bud2/backend/internal/domain/checkin"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func TestGetUseCase_Execute_Success(t *testing.T) {
	id := uuid.New()
	tenantID := fixtures.NewTestTenantID()
	expected := &domaincheckin.CheckIn{ID: id, OrgID: tenantID.UUID(), Value: "80"}

	repo := &mocks.CheckInRepository{}
	repo.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(expected, nil)

	uc := appcheckin.NewGetUseCase(repo, testutil.NewDiscardLogger())
	got, err := uc.Execute(context.Background(), tenantID, id)

	require.NoError(t, err)
	assert.Equal(t, expected, got)
	repo.AssertExpectations(t)
}

func TestGetUseCase_Execute_NotFound_PropagatesError(t *testing.T) {
	repo := &mocks.CheckInRepository{}
	repo.On("GetByID", mock.Anything, mock.Anything, mock.Anything).Return(nil, domaincheckin.ErrNotFound)

	uc := appcheckin.NewGetUseCase(repo, testutil.NewDiscardLogger())
	_, err := uc.Execute(context.Background(), fixtures.NewTestTenantID(), uuid.New())

	assert.ErrorIs(t, err, domaincheckin.ErrNotFound)
}
