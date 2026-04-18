package bootstrap

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/getbud-co/bud2/backend/internal/api/httputil"
	appbootstrap "github.com/getbud-co/bud2/backend/internal/app/bootstrap"
)

func TestHandleError(t *testing.T) {
	rr := httptest.NewRecorder()

	assert.True(t, handleError(rr, appbootstrap.ErrAlreadyBootstrapped))
	assert.Equal(t, http.StatusConflict, rr.Code)

	var problem httputil.ProblemDetail
	assert.NoError(t, json.Unmarshal(rr.Body.Bytes(), &problem))
	assert.Equal(t, "Conflict", problem.Title)
	assert.Equal(t, appbootstrap.ErrAlreadyBootstrapped.Error(), problem.Detail)
}

func TestHandleError_Passthrough(t *testing.T) {
	rr := httptest.NewRecorder()

	assert.False(t, handleError(rr, errors.New("boom")))
	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Empty(t, rr.Body.String())
}
