package indicator

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	domainindicator "github.com/getbud-co/bud2/backend/internal/domain/indicator"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func TestGetUseCase_Execute_DelegatesToRepository(t *testing.T) {
	repo := new(mocks.IndicatorRepository)
	id := uuid.New()
	want := &domainindicator.Indicator{ID: id}
	repo.On("GetByID", mock.Anything, id, mock.AnythingOfType("uuid.UUID")).Return(want, nil)

	got, err := NewGetUseCase(repo, testutil.NewDiscardLogger()).Execute(context.Background(), fixtures.NewTestTenantID(), id)
	require.NoError(t, err)
	assert.Same(t, want, got)
}

func TestGetUseCase_Execute_PropagatesNotFound(t *testing.T) {
	repo := new(mocks.IndicatorRepository)
	repo.On("GetByID", mock.Anything, mock.Anything, mock.Anything).Return(nil, domainindicator.ErrNotFound)

	_, err := NewGetUseCase(repo, testutil.NewDiscardLogger()).Execute(context.Background(), fixtures.NewTestTenantID(), uuid.New())
	assert.ErrorIs(t, err, domainindicator.ErrNotFound)
}
