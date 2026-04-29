package checkin

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domaincheckin "github.com/getbud-co/bud2/backend/internal/domain/checkin"
)

func TestHandleError_MapsDomainErrorsToHTTPStatuses(t *testing.T) {
	cases := []struct {
		name     string
		err      error
		wantCode int
	}{
		{"ErrNotFound → 404", domaincheckin.ErrNotFound, http.StatusNotFound},
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
	wrapped := checkinErrWrap{inner: domaincheckin.ErrNotFound}
	rr := httptest.NewRecorder()

	handleError(rr, wrapped)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

type checkinErrWrap struct{ inner error }

func (e checkinErrWrap) Error() string { return "wrap: " + e.inner.Error() }
func (e checkinErrWrap) Unwrap() error { return e.inner }
