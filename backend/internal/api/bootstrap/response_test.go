package bootstrap

import (
	"testing"

	"github.com/stretchr/testify/assert"

	appbootstrap "github.com/getbud-co/bud2/backend/internal/app/bootstrap"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
)

func TestCreateBootstrapResponse(t *testing.T) {
	org := fixtures.NewOrganization()
	user := fixtures.NewUser()
	resp := createBootstrapResponse(&appbootstrap.Result{
		Organization: *org,
		Admin:        *user,
		AccessToken:  "token",
	})

	assert.Equal(t, "token", resp.AccessToken)
	assert.Equal(t, "Bearer", resp.TokenType)
	assert.Equal(t, org.ID.String(), resp.Organization.ID)
	assert.Equal(t, user.ID.String(), resp.Admin.ID)
	assert.False(t, resp.Admin.IsSystemAdmin)
}
