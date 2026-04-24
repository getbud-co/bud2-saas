package role

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHandleError_ReturnsInternalServerErrorProblem(t *testing.T) {
	rr := httptest.NewRecorder()

	handleError(rr, errors.New("boom"))

	require.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Equal(t, "application/problem+json", rr.Header().Get("Content-Type"))

	var body struct {
		Title  string `json:"title"`
		Status int    `json:"status"`
		Detail string `json:"detail"`
	}
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &body))
	assert.Equal(t, "Internal Server Error", body.Title)
	assert.Equal(t, http.StatusInternalServerError, body.Status)
	assert.Equal(t, "an unexpected error occurred", body.Detail)
}
