package permission

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	permdom "github.com/getbud-co/bud2/backend/internal/domain/permission"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func TestListUseCase_Execute_ReturnsFullCatalog(t *testing.T) {
	uc := NewListUseCase(testutil.NewDiscardLogger())

	perms, err := uc.Execute(context.Background())

	require.NoError(t, err)
	assert.Equal(t, permdom.Catalog(), perms)
}
