package tag

import (
	"errors"
	"net/http"

	"github.com/getbud-co/bud2/backend/internal/api/httputil"
	"github.com/getbud-co/bud2/backend/internal/domain"
	domaintag "github.com/getbud-co/bud2/backend/internal/domain/tag"
)

func handleError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, domaintag.ErrNotFound):
		httputil.WriteProblem(w, http.StatusNotFound, "Not Found", err.Error())
	case errors.Is(err, domaintag.ErrNameExists):
		httputil.WriteProblem(w, http.StatusConflict, "Conflict", err.Error())
	case errors.Is(err, domain.ErrValidation):
		httputil.WriteProblem(w, http.StatusUnprocessableEntity, "Unprocessable Entity", err.Error())
	default:
		httputil.WriteProblem(w, http.StatusInternalServerError, "Internal Server Error", "an unexpected error occurred")
	}
}
