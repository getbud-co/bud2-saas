package auth

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"

	appauth "github.com/getbud-co/bud2/backend/internal/app/auth"
)

func TestLoginRequestToCommand(t *testing.T) {
	req := loginRequest{Email: "admin@example.com", Password: "password123"}

	cmd := req.toCommand()

	assert.Equal(t, appauth.LoginCommand{Email: "admin@example.com", Password: "password123"}, cmd)
}

func TestUpdateSessionRequestToCommand(t *testing.T) {
	id := uuid.New()
	req := updateSessionRequest{OrganizationID: id.String()}

	cmd, err := req.toCommand()

	assert.NoError(t, err)
	assert.Equal(t, appauth.SwitchOrganizationCommand{OrganizationID: id}, cmd)
}

func TestUpdateSessionRequestToCommand_InvalidUUID(t *testing.T) {
	req := updateSessionRequest{OrganizationID: "invalid"}

	_, err := req.toCommand()

	assert.Error(t, err)
}
