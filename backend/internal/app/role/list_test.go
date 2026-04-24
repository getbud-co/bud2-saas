package role

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/getbud-co/bud2/backend/internal/domain"
	roledom "github.com/getbud-co/bud2/backend/internal/domain/role"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

type fakeRepo struct {
	roles          []roledom.Role
	err            error
	organizationID uuid.UUID
}

func (f *fakeRepo) List(_ context.Context, organizationID uuid.UUID) ([]roledom.Role, error) {
	f.organizationID = organizationID
	if f.err != nil {
		return nil, f.err
	}
	return f.roles, nil
}

func TestListUseCase_Execute_InjectsPermissionIDsFromMapping(t *testing.T) {
	repo := &fakeRepo{roles: []roledom.Role{
		{ID: uuid.New(), Slug: "colaborador", Name: "Colaborador", Type: roledom.TypeSystem, Scope: roledom.ScopeSelf, IsDefault: true, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: uuid.New(), Slug: "super-admin", Name: "Super Admin", Type: roledom.TypeSystem, Scope: roledom.ScopeOrg, CreatedAt: time.Now(), UpdatedAt: time.Now()},
	}}
	uc := NewListUseCase(repo, testutil.NewDiscardLogger())
	tenantID := domain.TenantID(uuid.New())

	roles, err := uc.Execute(context.Background(), ListCommand{OrganizationID: tenantID})

	require.NoError(t, err)
	require.Len(t, roles, 2)
	assert.Equal(t, roledom.RolePermissions["colaborador"], roles[0].PermissionIDs)
	assert.Equal(t, roledom.RolePermissions["super-admin"], roles[1].PermissionIDs)
	assert.Equal(t, tenantID.UUID(), repo.organizationID)
}

func TestListUseCase_Execute_UnknownSlugGetsEmptyPermissionIDs(t *testing.T) {
	repo := &fakeRepo{roles: []roledom.Role{
		{ID: uuid.New(), Slug: "unmapped", Name: "Unmapped", Type: roledom.TypeCustom, Scope: roledom.ScopeSelf, CreatedAt: time.Now(), UpdatedAt: time.Now()},
	}}
	uc := NewListUseCase(repo, testutil.NewDiscardLogger())
	tenantID := domain.TenantID(uuid.New())

	roles, err := uc.Execute(context.Background(), ListCommand{OrganizationID: tenantID})

	require.NoError(t, err)
	require.Len(t, roles, 1)
	assert.NotNil(t, roles[0].PermissionIDs)
	assert.Empty(t, roles[0].PermissionIDs)
}

func TestListUseCase_Execute_PropagatesRepoError(t *testing.T) {
	repoErr := errors.New("boom")
	repo := &fakeRepo{err: repoErr}
	uc := NewListUseCase(repo, testutil.NewDiscardLogger())
	tenantID := domain.TenantID(uuid.New())

	_, err := uc.Execute(context.Background(), ListCommand{OrganizationID: tenantID})

	assert.ErrorIs(t, err, repoErr)
}
