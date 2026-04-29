package tag

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	domaintag "github.com/getbud-co/bud2/backend/internal/domain/tag"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func TestListUseCase_Execute_DefaultPagination(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	expected := domaintag.ListResult{Tags: []domaintag.Tag{{Name: "Design"}}, Total: 1}

	repo := new(mocks.TagRepository)
	repo.On("List", mock.Anything, tenantID.UUID(), 1, 20).Return(expected, nil)

	uc := NewListUseCase(repo, testutil.NewDiscardLogger())
	result, err := uc.Execute(context.Background(), ListCommand{OrganizationID: tenantID})

	require.NoError(t, err)
	assert.Equal(t, expected, result)
}

func TestListUseCase_Execute_SizeCappedAt100(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	expected := domaintag.ListResult{}

	repo := new(mocks.TagRepository)
	repo.On("List", mock.Anything, tenantID.UUID(), 1, 100).Return(expected, nil)

	uc := NewListUseCase(repo, testutil.NewDiscardLogger())
	_, err := uc.Execute(context.Background(), ListCommand{OrganizationID: tenantID, Page: 1, Size: 999})

	require.NoError(t, err)
	repo.AssertExpectations(t)
}
