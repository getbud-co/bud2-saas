package role

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/getbud-co/bud2/backend/internal/domain"
	roledom "github.com/getbud-co/bud2/backend/internal/domain/role"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func TestListUseCase_Execute_InjectsPermissionIDsFromMapping(t *testing.T) {
	tenantID := domain.TenantID(uuid.New())
	repo := new(mocks.RoleRepository)
	repo.On("List", mock.Anything, tenantID.UUID()).Return([]roledom.Role{
		{ID: uuid.New(), Slug: "colaborador", Name: "Colaborador", Type: roledom.TypeSystem, Scope: roledom.ScopeSelf, IsDefault: true, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: uuid.New(), Slug: "super-admin", Name: "Super Admin", Type: roledom.TypeSystem, Scope: roledom.ScopeOrg, CreatedAt: time.Now(), UpdatedAt: time.Now()},
	}, nil)

	uc := NewListUseCase(repo, testutil.NewDiscardLogger())
	roles, err := uc.Execute(context.Background(), ListCommand{OrganizationID: tenantID})

	require.NoError(t, err)
	require.Len(t, roles, 2)
	assert.Equal(t, roledom.RolePermissions["colaborador"], roles[0].PermissionIDs)
	assert.Equal(t, roledom.RolePermissions["super-admin"], roles[1].PermissionIDs)
	repo.AssertExpectations(t)
}

func TestListUseCase_Execute_UnknownSlugGetsEmptyPermissionIDs(t *testing.T) {
	tenantID := domain.TenantID(uuid.New())
	repo := new(mocks.RoleRepository)
	repo.On("List", mock.Anything, tenantID.UUID()).Return([]roledom.Role{
		{ID: uuid.New(), Slug: "unmapped", Name: "Unmapped", Type: roledom.TypeCustom, Scope: roledom.ScopeSelf, CreatedAt: time.Now(), UpdatedAt: time.Now()},
	}, nil)

	uc := NewListUseCase(repo, testutil.NewDiscardLogger())
	roles, err := uc.Execute(context.Background(), ListCommand{OrganizationID: tenantID})

	require.NoError(t, err)
	require.Len(t, roles, 1)
	assert.NotNil(t, roles[0].PermissionIDs)
	assert.Empty(t, roles[0].PermissionIDs)
}

func TestListUseCase_Execute_PropagatesRepoError(t *testing.T) {
	repoErr := errors.New("boom")
	repo := new(mocks.RoleRepository)
	repo.On("List", mock.Anything, mock.Anything).Return(nil, repoErr)

	uc := NewListUseCase(repo, testutil.NewDiscardLogger())
	_, err := uc.Execute(context.Background(), ListCommand{OrganizationID: domain.TenantID(uuid.New())})

	assert.ErrorIs(t, err, repoErr)
}
