package organization

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	org "github.com/getbud-co/bud2/backend/internal/domain/organization"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func TestListUseCase_Execute_Success(t *testing.T) {
	repo := new(mocks.OrganizationRepository)
	uc := NewListUseCase(repo, testutil.NewDiscardLogger())

	orgs := fixtures.NewOrganizationList(2)
	expected := org.ListResult{Organizations: orgs, Total: 2}
	repo.On("List", mock.Anything, org.ListFilter{Page: 1, Size: 20}).Return(expected, nil)

	result, err := uc.Execute(context.Background(), ListCommand{Page: 1, Size: 20})

	assert.NoError(t, err)
	assert.Equal(t, expected, result)
}

func TestListUseCase_Execute_WithStatusFilter(t *testing.T) {
	repo := new(mocks.OrganizationRepository)
	uc := NewListUseCase(repo, testutil.NewDiscardLogger())

	status := "active"
	s := org.StatusActive
	repo.On("List", mock.Anything, org.ListFilter{Status: &s, Page: 1, Size: 20}).Return(org.ListResult{}, nil)

	_, err := uc.Execute(context.Background(), ListCommand{Status: &status, Page: 1, Size: 20})

	assert.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestListUseCase_Execute_DefaultPagination(t *testing.T) {
	repo := new(mocks.OrganizationRepository)
	uc := NewListUseCase(repo, testutil.NewDiscardLogger())

	repo.On("List", mock.Anything, org.ListFilter{Page: 1, Size: 20}).Return(org.ListResult{}, nil)

	_, err := uc.Execute(context.Background(), ListCommand{})

	assert.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestListUseCase_Execute_MaxSizeLimit(t *testing.T) {
	repo := new(mocks.OrganizationRepository)
	uc := NewListUseCase(repo, testutil.NewDiscardLogger())

	repo.On("List", mock.Anything, org.ListFilter{Page: 1, Size: 100}).Return(org.ListResult{}, nil)

	_, err := uc.Execute(context.Background(), ListCommand{Page: 1, Size: 500})

	assert.NoError(t, err)
	repo.AssertExpectations(t)
}
