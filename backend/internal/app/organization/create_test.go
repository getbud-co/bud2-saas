package organization

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	org "github.com/getbud-co/bud2/backend/internal/domain/organization"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func TestCreateUseCase_Execute_Success(t *testing.T) {
	repo := new(mocks.OrganizationRepository)
	uc := NewCreateUseCase(repo, testutil.NewDiscardLogger())

	expected := fixtures.NewOrganization()
	repo.On("GetByDomain", mock.Anything, "example.com").Return(nil, org.ErrNotFound)
	repo.On("GetByWorkspace", mock.Anything, "example").Return(nil, org.ErrNotFound)
	repo.On("Create", mock.Anything, mock.Anything).Return(expected, nil)

	result, err := uc.Execute(context.Background(), CreateCommand{
		Name: "Test Org", Domain: "example.com", Workspace: "example",
	})

	assert.NoError(t, err)
	assert.Equal(t, expected, result)
	repo.AssertExpectations(t)
}

func TestCreateUseCase_Execute_DomainAlreadyExists(t *testing.T) {
	repo := new(mocks.OrganizationRepository)
	uc := NewCreateUseCase(repo, testutil.NewDiscardLogger())

	repo.On("GetByDomain", mock.Anything, "example.com").Return(fixtures.NewOrganization(), nil)

	result, err := uc.Execute(context.Background(), CreateCommand{
		Name: "Test Org", Domain: "example.com", Workspace: "example",
	})

	assert.ErrorIs(t, err, org.ErrDomainExists)
	assert.Nil(t, result)
	repo.AssertNotCalled(t, "GetByWorkspace")
	repo.AssertNotCalled(t, "Create")
}

func TestCreateUseCase_Execute_WorkspaceAlreadyExists(t *testing.T) {
	repo := new(mocks.OrganizationRepository)
	uc := NewCreateUseCase(repo, testutil.NewDiscardLogger())

	repo.On("GetByDomain", mock.Anything, "example.com").Return(nil, org.ErrNotFound)
	repo.On("GetByWorkspace", mock.Anything, "example").Return(fixtures.NewOrganization(), nil)

	result, err := uc.Execute(context.Background(), CreateCommand{
		Name: "Test Org", Domain: "example.com", Workspace: "example",
	})

	assert.ErrorIs(t, err, org.ErrWorkspaceExists)
	assert.Nil(t, result)
	repo.AssertNotCalled(t, "Create")
}

func TestCreateUseCase_Execute_InvalidStatus(t *testing.T) {
	repo := new(mocks.OrganizationRepository)
	uc := NewCreateUseCase(repo, testutil.NewDiscardLogger())

	result, err := uc.Execute(context.Background(), CreateCommand{
		Name: "Test Org", Domain: "example.com", Workspace: "example", Status: "invalid",
	})

	assert.Error(t, err)
	assert.Nil(t, result)
	repo.AssertNotCalled(t, "GetByDomain")
}

func TestCreateUseCase_Execute_MissingName(t *testing.T) {
	repo := new(mocks.OrganizationRepository)
	uc := NewCreateUseCase(repo, testutil.NewDiscardLogger())

	result, err := uc.Execute(context.Background(), CreateCommand{
		Domain: "example.com", Workspace: "example",
	})

	assert.Error(t, err)
	assert.Nil(t, result)
}

func TestCreateUseCase_Execute_MissingDomain(t *testing.T) {
	repo := new(mocks.OrganizationRepository)
	uc := NewCreateUseCase(repo, testutil.NewDiscardLogger())

	result, err := uc.Execute(context.Background(), CreateCommand{
		Name: "Test Org", Workspace: "example",
	})

	assert.Error(t, err)
	assert.Nil(t, result)
}

func TestCreateUseCase_Execute_MissingWorkspace(t *testing.T) {
	repo := new(mocks.OrganizationRepository)
	uc := NewCreateUseCase(repo, testutil.NewDiscardLogger())

	result, err := uc.Execute(context.Background(), CreateCommand{
		Name: "Test Org", Domain: "example.com",
	})

	assert.Error(t, err)
	assert.Nil(t, result)
}

func TestCreateUseCase_Execute_GetByDomainError(t *testing.T) {
	repo := new(mocks.OrganizationRepository)
	uc := NewCreateUseCase(repo, testutil.NewDiscardLogger())

	repo.On("GetByDomain", mock.Anything, "example.com").Return(nil, errors.New("db error"))

	result, err := uc.Execute(context.Background(), CreateCommand{
		Name: "Test Org", Domain: "example.com", Workspace: "example",
	})

	assert.Error(t, err)
	assert.Nil(t, result)
}

func TestCreateUseCase_Execute_GetByWorkspaceError(t *testing.T) {
	repo := new(mocks.OrganizationRepository)
	uc := NewCreateUseCase(repo, testutil.NewDiscardLogger())

	repo.On("GetByDomain", mock.Anything, "example.com").Return(nil, org.ErrNotFound)
	repo.On("GetByWorkspace", mock.Anything, "example").Return(nil, errors.New("db error"))

	result, err := uc.Execute(context.Background(), CreateCommand{
		Name: "Test Org", Domain: "example.com", Workspace: "example",
	})

	assert.Error(t, err)
	assert.Nil(t, result)
}

func TestCreateUseCase_Execute_CreateError(t *testing.T) {
	repo := new(mocks.OrganizationRepository)
	uc := NewCreateUseCase(repo, testutil.NewDiscardLogger())

	repo.On("GetByDomain", mock.Anything, "example.com").Return(nil, org.ErrNotFound)
	repo.On("GetByWorkspace", mock.Anything, "example").Return(nil, org.ErrNotFound)
	repo.On("Create", mock.Anything, mock.Anything).Return(nil, errors.New("db error"))

	result, err := uc.Execute(context.Background(), CreateCommand{
		Name: "Test Org", Domain: "example.com", Workspace: "example",
	})

	assert.Error(t, err)
	assert.Nil(t, result)
}

func TestCreateUseCase_Execute_DefaultStatus(t *testing.T) {
	repo := new(mocks.OrganizationRepository)
	uc := NewCreateUseCase(repo, testutil.NewDiscardLogger())

	repo.On("GetByDomain", mock.Anything, "example.com").Return(nil, org.ErrNotFound)
	repo.On("GetByWorkspace", mock.Anything, "example").Return(nil, org.ErrNotFound)
	repo.On("Create", mock.Anything, mock.MatchedBy(func(o *org.Organization) bool {
		return o.Status == org.StatusActive
	})).Return(fixtures.NewOrganization(), nil)

	result, err := uc.Execute(context.Background(), CreateCommand{
		Name: "Test Org", Domain: "example.com", Workspace: "example",
	})

	assert.NoError(t, err)
	assert.NotNil(t, result)
}

func TestCreateUseCase_Execute_InactiveStatus(t *testing.T) {
	repo := new(mocks.OrganizationRepository)
	uc := NewCreateUseCase(repo, testutil.NewDiscardLogger())

	repo.On("GetByDomain", mock.Anything, "example.com").Return(nil, org.ErrNotFound)
	repo.On("GetByWorkspace", mock.Anything, "example").Return(nil, org.ErrNotFound)
	repo.On("Create", mock.Anything, mock.MatchedBy(func(o *org.Organization) bool {
		return o.Status == org.StatusInactive
	})).Return(fixtures.NewInactiveOrganization(), nil)

	result, err := uc.Execute(context.Background(), CreateCommand{
		Name: "Test Org", Domain: "example.com", Workspace: "example", Status: "inactive",
	})

	assert.NoError(t, err)
	assert.Equal(t, org.StatusInactive, result.Status)
}
