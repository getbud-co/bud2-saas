package task

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domaintask "github.com/getbud-co/bud2/backend/internal/domain/task"
)

func TestHandleError_MapsDomainErrorsToHTTPStatuses(t *testing.T) {
	cases := []struct {
		name     string
		err      error
		wantCode int
	}{
		{"ErrNotFound → 404", domaintask.ErrNotFound, http.StatusNotFound},
		{"ErrInvalidReference → 422", domaintask.ErrInvalidReference, http.StatusUnprocessableEntity},
		{"domain.ErrValidation → 422", domain.ErrValidation, http.StatusUnprocessableEntity},
		{"unknown error → 500", errors.New("boom"), http.StatusInternalServerError},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rr := httptest.NewRecorder()
			handleError(rr, tc.err)
			assert.Equal(t, tc.wantCode, rr.Code)
			assert.Equal(t, "application/problem+json", rr.Header().Get("Content-Type"))
		})
	}
}

func TestHandleError_WrappedErrors_StillMatchByErrorsIs(t *testing.T) {
	wrapped := taskErrWrap{inner: domaintask.ErrInvalidReference}
	rr := httptest.NewRecorder()

	handleError(rr, wrapped)

	assert.Equal(t, http.StatusUnprocessableEntity, rr.Code)
}

type taskErrWrap struct{ inner error }

func (e taskErrWrap) Error() string { return "wrap: " + e.inner.Error() }
func (e taskErrWrap) Unwrap() error { return e.inner }
