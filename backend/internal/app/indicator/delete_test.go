package indicator

import (
	"context"
	"errors"
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

func TestDeleteUseCase_Execute_HappyPath(t *testing.T) {
	repo := new(mocks.IndicatorRepository)
	id := uuid.New()
	repo.On("GetByID", mock.Anything, id, mock.Anything).Return(&domainindicator.Indicator{ID: id}, nil)
	repo.On("SoftDelete", mock.Anything, id, mock.Anything).Return(nil)

	err := NewDeleteUseCase(repo, testutil.NewDiscardLogger()).Execute(context.Background(), DeleteCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		ID:             id,
	})
	require.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestDeleteUseCase_Execute_AlreadyDeleted_IsIdempotent(t *testing.T) {
	repo := new(mocks.IndicatorRepository)
	repo.On("GetByID", mock.Anything, mock.Anything, mock.Anything).Return(nil, domainindicator.ErrNotFound)

	err := NewDeleteUseCase(repo, testutil.NewDiscardLogger()).Execute(context.Background(), DeleteCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		ID:             uuid.New(),
	})
	require.NoError(t, err)
	repo.AssertNotCalled(t, "SoftDelete")
}

func TestDeleteUseCase_Execute_PropagatesRepoError(t *testing.T) {
	repo := new(mocks.IndicatorRepository)
	repoErr := errors.New("db down")
	repo.On("GetByID", mock.Anything, mock.Anything, mock.Anything).Return(&domainindicator.Indicator{}, nil)
	repo.On("SoftDelete", mock.Anything, mock.Anything, mock.Anything).Return(repoErr)

	err := NewDeleteUseCase(repo, testutil.NewDiscardLogger()).Execute(context.Background(), DeleteCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		ID:             uuid.New(),
	})
	assert.ErrorIs(t, err, repoErr)
}
