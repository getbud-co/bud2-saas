package organization

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	org "github.com/getbud-co/bud2/backend/internal/domain/organization"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func TestUpdateUseCase_Execute_Success(t *testing.T) {
	repo := new(mocks.OrganizationRepository)
	uc := NewUpdateUseCase(repo, testutil.NewDiscardLogger())

	existing := fixtures.NewOrganization()
	updated := fixtures.NewOrganization()
	updated.Name = "Updated Name"

	repo.On("GetByID", mock.Anything, existing.ID).Return(existing, nil)
	repo.On("Update", mock.Anything, mock.Anything).Return(updated, nil)

	result, err := uc.Execute(context.Background(), UpdateCommand{
		ID: existing.ID, Name: "Updated Name", Domain: existing.Domain, Workspace: existing.Workspace, Status: string(existing.Status),
	})

	assert.NoError(t, err)
	assert.Equal(t, "Updated Name", result.Name)
	repo.AssertNotCalled(t, "GetByDomain")
	repo.AssertNotCalled(t, "GetByWorkspace")
}

func TestUpdateUseCase_Execute_NotFound(t *testing.T) {
	repo := new(mocks.OrganizationRepository)
	uc := NewUpdateUseCase(repo, testutil.NewDiscardLogger())

	id := uuid.New()
	repo.On("GetByID", mock.Anything, id).Return(nil, org.ErrNotFound)

	result, err := uc.Execute(context.Background(), UpdateCommand{
		ID: id, Name: "Test", Domain: "example.com", Workspace: "example", Status: "active",
	})

	assert.ErrorIs(t, err, org.ErrNotFound)
	assert.Nil(t, result)
}

func TestUpdateUseCase_Execute_DomainConflict(t *testing.T) {
	repo := new(mocks.OrganizationRepository)
	uc := NewUpdateUseCase(repo, testutil.NewDiscardLogger())

	existing := fixtures.NewOrganization()
	otherOrg := fixtures.NewOrganization()
	otherOrg.ID = uuid.New()

	repo.On("GetByID", mock.Anything, existing.ID).Return(existing, nil)
	repo.On("GetByDomain", mock.Anything, "new-domain.com").Return(otherOrg, nil)

	result, err := uc.Execute(context.Background(), UpdateCommand{
		ID: existing.ID, Name: existing.Name, Domain: "new-domain.com", Workspace: existing.Workspace, Status: string(existing.Status),
	})

	assert.ErrorIs(t, err, org.ErrDomainExists)
	assert.Nil(t, result)
}

func TestUpdateUseCase_Execute_WorkspaceConflict(t *testing.T) {
	repo := new(mocks.OrganizationRepository)
	uc := NewUpdateUseCase(repo, testutil.NewDiscardLogger())

	existing := fixtures.NewOrganization()
	otherOrg := fixtures.NewOrganization()
	otherOrg.ID = uuid.New()

	repo.On("GetByID", mock.Anything, existing.ID).Return(existing, nil)
	repo.On("GetByWorkspace", mock.Anything, "new-workspace").Return(otherOrg, nil)

	result, err := uc.Execute(context.Background(), UpdateCommand{
		ID: existing.ID, Name: existing.Name, Domain: existing.Domain, Workspace: "new-workspace", Status: string(existing.Status),
	})

	assert.ErrorIs(t, err, org.ErrWorkspaceExists)
	assert.Nil(t, result)
}

func TestUpdateUseCase_Execute_SameDomainNoConflict(t *testing.T) {
	repo := new(mocks.OrganizationRepository)
	uc := NewUpdateUseCase(repo, testutil.NewDiscardLogger())

	existing := fixtures.NewOrganization()
	repo.On("GetByID", mock.Anything, existing.ID).Return(existing, nil)
	repo.On("Update", mock.Anything, mock.Anything).Return(existing, nil)

	result, err := uc.Execute(context.Background(), UpdateCommand{
		ID: existing.ID, Name: existing.Name, Domain: existing.Domain, Workspace: existing.Workspace, Status: string(existing.Status),
	})

	assert.NoError(t, err)
	assert.NotNil(t, result)
	repo.AssertNotCalled(t, "GetByDomain")
	repo.AssertNotCalled(t, "GetByWorkspace")
}

func TestUpdateUseCase_Execute_InvalidStatus(t *testing.T) {
	repo := new(mocks.OrganizationRepository)
	uc := NewUpdateUseCase(repo, testutil.NewDiscardLogger())

	existing := fixtures.NewOrganization()
	repo.On("GetByID", mock.Anything, existing.ID).Return(existing, nil)

	result, err := uc.Execute(context.Background(), UpdateCommand{
		ID: existing.ID, Name: existing.Name, Domain: existing.Domain, Workspace: existing.Workspace, Status: "invalid",
	})

	assert.Error(t, err)
	assert.Nil(t, result)
}

func TestUpdateUseCase_Execute_GetByDomainError(t *testing.T) {
	repo := new(mocks.OrganizationRepository)
	uc := NewUpdateUseCase(repo, testutil.NewDiscardLogger())

	existing := fixtures.NewOrganization()
	repo.On("GetByID", mock.Anything, existing.ID).Return(existing, nil)
	repo.On("GetByDomain", mock.Anything, "new.com").Return(nil, errors.New("db error"))

	result, err := uc.Execute(context.Background(), UpdateCommand{
		ID: existing.ID, Name: existing.Name, Domain: "new.com", Workspace: existing.Workspace, Status: string(existing.Status),
	})

	assert.Error(t, err)
	assert.Nil(t, result)
}

func TestUpdateUseCase_Execute_UpdateError(t *testing.T) {
	repo := new(mocks.OrganizationRepository)
	uc := NewUpdateUseCase(repo, testutil.NewDiscardLogger())

	existing := fixtures.NewOrganization()
	repo.On("GetByID", mock.Anything, existing.ID).Return(existing, nil)
	repo.On("Update", mock.Anything, mock.Anything).Return(nil, errors.New("db error"))

	result, err := uc.Execute(context.Background(), UpdateCommand{
		ID: existing.ID, Name: existing.Name, Domain: existing.Domain, Workspace: existing.Workspace, Status: string(existing.Status),
	})

	assert.Error(t, err)
	assert.Nil(t, result)
}
