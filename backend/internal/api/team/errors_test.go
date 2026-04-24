package team

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domainteam "github.com/getbud-co/bud2/backend/internal/domain/team"
)

func TestHandleError_WritesProblemDetails(t *testing.T) {
	tests := []struct {
		name   string
		err    error
		status int
		title  string
		detail string
	}{
		{name: "not found", err: domainteam.ErrNotFound, status: http.StatusNotFound, title: "Not Found", detail: domainteam.ErrNotFound.Error()},
		{name: "name exists", err: domainteam.ErrNameExists, status: http.StatusConflict, title: "Conflict", detail: domainteam.ErrNameExists.Error()},
		{name: "validation", err: fmt.Errorf("%w: invalid team", domain.ErrValidation), status: http.StatusUnprocessableEntity, title: "Unprocessable Entity", detail: "validation error: invalid team"},
		{name: "unknown", err: errors.New("boom"), status: http.StatusInternalServerError, title: "Internal Server Error", detail: "an unexpected error occurred"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rr := httptest.NewRecorder()

			handleError(rr, tt.err)

			assert.Equal(t, tt.status, rr.Code)
			assert.Equal(t, "application/problem+json", rr.Header().Get("Content-Type"))
			var body map[string]any
			require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &body))
			assert.Equal(t, tt.title, body["title"])
			assert.Equal(t, float64(tt.status), body["status"])
			assert.Equal(t, tt.detail, body["detail"])
		})
	}
}
