package user

import (
	"errors"
	"net/http"

	"github.com/getbud-co/bud2/backend/internal/api/httputil"
	appuser "github.com/getbud-co/bud2/backend/internal/app/user"
	"github.com/getbud-co/bud2/backend/internal/domain"
	"github.com/getbud-co/bud2/backend/internal/domain/membership"
	usr "github.com/getbud-co/bud2/backend/internal/domain/user"
)

func handleError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, usr.ErrNotFound), errors.Is(err, membership.ErrNotFound):
		httputil.WriteProblem(w, http.StatusNotFound, "Not Found", err.Error())
	case errors.Is(err, appuser.ErrCannotDeleteOwnMembership):
		httputil.WriteProblem(w, http.StatusForbidden, "Forbidden", err.Error())
	case errors.Is(err, usr.ErrEmailExists), errors.Is(err, membership.ErrAlreadyExists):
		httputil.WriteProblem(w, http.StatusConflict, "Conflict", err.Error())
	case errors.Is(err, domain.ErrValidation):
		httputil.WriteProblem(w, http.StatusUnprocessableEntity, "Unprocessable Entity", err.Error())
	default:
		httputil.WriteProblem(w, http.StatusInternalServerError, "Internal Server Error", "an unexpected error occurred")
	}
}
