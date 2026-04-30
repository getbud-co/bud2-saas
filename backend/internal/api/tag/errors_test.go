package tag

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domaintag "github.com/getbud-co/bud2/backend/internal/domain/tag"
)

func TestHandleError_NotFound(t *testing.T) {
	w := httptest.NewRecorder()
	handleError(w, domaintag.ErrNotFound)
	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestHandleError_NameExists(t *testing.T) {
	w := httptest.NewRecorder()
	handleError(w, domaintag.ErrNameExists)
	assert.Equal(t, http.StatusConflict, w.Code)
}

func TestHandleError_ValidationError(t *testing.T) {
	w := httptest.NewRecorder()
	handleError(w, domain.ErrValidation)
	assert.Equal(t, http.StatusUnprocessableEntity, w.Code)
}

func TestHandleError_UnknownError(t *testing.T) {
	w := httptest.NewRecorder()
	handleError(w, assert.AnError)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}
