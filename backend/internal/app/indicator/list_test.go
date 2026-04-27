package indicator

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	domainindicator "github.com/getbud-co/bud2/backend/internal/domain/indicator"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func TestListUseCase_Execute_AppliesPaginationDefaults(t *testing.T) {
	repo := new(mocks.IndicatorRepository)
	repo.On("List", mock.Anything, mock.MatchedBy(func(f domainindicator.ListFilter) bool {
		return f.Page == 1 && f.Size == 20
	})).Return(domainindicator.ListResult{}, nil)

	res, err := NewListUseCase(repo, testutil.NewDiscardLogger()).Execute(context.Background(), ListCommand{
		OrganizationID: fixtures.NewTestTenantID(),
	})
	require.NoError(t, err)
	assert.Equal(t, 1, res.Page)
	assert.Equal(t, 20, res.Size)
}

func TestListUseCase_Execute_ClampsSizeAt100(t *testing.T) {
	repo := new(mocks.IndicatorRepository)
	repo.On("List", mock.Anything, mock.MatchedBy(func(f domainindicator.ListFilter) bool {
		return f.Size == 100
	})).Return(domainindicator.ListResult{}, nil)

	res, err := NewListUseCase(repo, testutil.NewDiscardLogger()).Execute(context.Background(), ListCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		Size:           500,
	})
	require.NoError(t, err)
	assert.Equal(t, 100, res.Size)
}
