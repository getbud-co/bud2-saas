package bootstrap

import (
	"testing"

	"github.com/stretchr/testify/assert"

	appbootstrap "github.com/getbud-co/bud2/backend/internal/app/bootstrap"
)

func TestCreateRequestToCommand(t *testing.T) {
	req := createRequest{
		OrganizationName:      "Test Org",
		OrganizationDomain:    "example.com",
		OrganizationWorkspace: "example",
		AdminName:             "Admin",
		AdminEmail:            "admin@example.com",
		AdminPassword:         "password123",
	}

	cmd := req.toCommand()

	assert.Equal(t, appbootstrap.Command{
		OrganizationName:      "Test Org",
		OrganizationDomain:    "example.com",
		OrganizationWorkspace: "example",
		AdminName:             "Admin",
		AdminEmail:            "admin@example.com",
		AdminPassword:         "password123",
	}, cmd)
}
