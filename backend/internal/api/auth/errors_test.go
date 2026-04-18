package auth

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/getbud-co/bud2/backend/internal/api/httputil"
	appauth "github.com/getbud-co/bud2/backend/internal/app/auth"
)

func TestHandleAuthError(t *testing.T) {
	tests := []struct {
		name   string
		err    error
		status int
		title  string
		detail string
	}{
		{name: "invalid credentials", err: appauth.ErrInvalidCredentials, status: http.StatusUnauthorized, title: "Unauthorized", detail: "invalid credentials"},
		{name: "inactive user", err: appauth.ErrUserInactive, status: http.StatusForbidden, title: "Forbidden", detail: "user account is inactive"},
		{name: "no orgs", err: appauth.ErrNoOrganizations, status: http.StatusForbidden, title: "Forbidden", detail: "user has no accessible organizations"},
		{name: "internal", err: errors.New("boom"), status: http.StatusInternalServerError, title: "Internal Server Error", detail: "an unexpected error occurred"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rr := httptest.NewRecorder()

			handleAuthError(rr, tt.err)

			assert.Equal(t, tt.status, rr.Code)
			var problem httputil.ProblemDetail
			assert.NoError(t, json.Unmarshal(rr.Body.Bytes(), &problem))
			assert.Equal(t, tt.title, problem.Title)
			assert.Equal(t, tt.detail, problem.Detail)
		})
	}
}
