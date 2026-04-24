package permission

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	domainperm "github.com/getbud-co/bud2/backend/internal/domain/permission"
)

func TestToResponse_MapsFields(t *testing.T) {
	got := toResponse(domainperm.Permission{
		ID:          "people.view",
		Group:       domainperm.GroupPeople,
		Label:       "Visualizar",
		Description: "Ver informacoes de colaboradores",
	})

	assert.Equal(t, "people.view", got.ID)
	assert.Equal(t, "people", got.Group)
	assert.Equal(t, "Visualizar", got.Label)
	assert.Equal(t, "Ver informacoes de colaboradores", got.Description)
}

func TestToListResponse_PreservesOrderAndSize(t *testing.T) {
	got := toListResponse([]domainperm.Permission{
		{ID: "people.view", Group: domainperm.GroupPeople, Label: "Visualizar", Description: "Ver pessoas"},
		{ID: "settings.access", Group: domainperm.GroupSettings, Label: "Acessar", Description: "Acessar configuracoes"},
	})

	require.Len(t, got.Data, 2)
	assert.Equal(t, "people.view", got.Data[0].ID)
	assert.Equal(t, "settings.access", got.Data[1].ID)
}
