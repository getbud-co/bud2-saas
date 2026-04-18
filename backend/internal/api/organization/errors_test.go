package organization

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/getbud-co/bud2/backend/internal/api/httputil"
	"github.com/getbud-co/bud2/backend/internal/domain"
	org "github.com/getbud-co/bud2/backend/internal/domain/organization"
)

func TestHandleError(t *testing.T) {
	tests := []struct {
		name   string
		err    error
		status int
		title  string
		detail string
	}{
		{name: "not found", err: org.ErrNotFound, status: http.StatusNotFound, title: "Not Found", detail: org.ErrNotFound.Error()},
		{name: "domain exists", err: org.ErrDomainExists, status: http.StatusConflict, title: "Conflict", detail: org.ErrDomainExists.Error()},
		{name: "workspace exists", err: org.ErrWorkspaceExists, status: http.StatusConflict, title: "Conflict", detail: org.ErrWorkspaceExists.Error()},
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
