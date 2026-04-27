package mission

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domainmission "github.com/getbud-co/bud2/backend/internal/domain/mission"
)

func TestHandleError_MapsDomainErrorsToHTTPStatuses(t *testing.T) {
	cases := []struct {
		name     string
		err      error
		wantCode int
	}{
		{"ErrNotFound → 404", domainmission.ErrNotFound, http.StatusNotFound},
		{"ErrInvalidParent → 422", domainmission.ErrInvalidParent, http.StatusUnprocessableEntity},
		{"ErrInvalidReference → 422", domainmission.ErrInvalidReference, http.StatusUnprocessableEntity},
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
	// errors.Is must follow the wrap chain. Sanity check that our switch keeps
	// working when the use case wraps the sentinel with %w.
	wrapped := errWrap{inner: domainmission.ErrInvalidReference}
	rr := httptest.NewRecorder()

	handleError(rr, wrapped)

	assert.Equal(t, http.StatusUnprocessableEntity, rr.Code)
}

type errWrap struct{ inner error }

func (e errWrap) Error() string { return "wrap: " + e.inner.Error() }
func (e errWrap) Unwrap() error { return e.inner }
