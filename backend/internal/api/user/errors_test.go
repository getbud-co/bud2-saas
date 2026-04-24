package user

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/getbud-co/bud2/backend/internal/api/httputil"
	"github.com/getbud-co/bud2/backend/internal/domain"
	"github.com/getbud-co/bud2/backend/internal/domain/organization"
	usr "github.com/getbud-co/bud2/backend/internal/domain/user"
)

func TestHandleError(t *testing.T) {
	tests := []struct {
		name   string
		err    error
		status int
		title  string
		detail string
	}{
		{name: "not found", err: usr.ErrNotFound, status: http.StatusNotFound, title: "Not Found", detail: usr.ErrNotFound.Error()},
		{name: "membership not found", err: organization.ErrMembershipNotFound, status: http.StatusNotFound, title: "Not Found", detail: organization.ErrMembershipNotFound.Error()},
		{name: "email exists", err: usr.ErrEmailExists, status: http.StatusConflict, title: "Conflict", detail: usr.ErrEmailExists.Error()},
		{name: "already exists", err: organization.ErrMembershipAlreadyExists, status: http.StatusConflict, title: "Conflict", detail: organization.ErrMembershipAlreadyExists.Error()},
		{name: "validation", err: domain.ErrValidation, status: http.StatusUnprocessableEntity, title: "Unprocessable Entity", detail: domain.ErrValidation.Error()},
		{name: "internal", err: errors.New("boom"), status: http.StatusInternalServerError, title: "Internal Server Error", detail: "an unexpected error occurred"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rr := httptest.NewRecorder()

			handleError(rr, tt.err)

			assert.Equal(t, tt.status, rr.Code)
			var problem httputil.ProblemDetail
			assert.NoError(t, json.Unmarshal(rr.Body.Bytes(), &problem))
			assert.Equal(t, tt.title, problem.Title)
			assert.Equal(t, tt.detail, problem.Detail)
		})
	}
}
