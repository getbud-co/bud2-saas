package task

import (
	"errors"
	"net/http"

	"github.com/getbud-co/bud2/backend/internal/api/httputil"
	"github.com/getbud-co/bud2/backend/internal/domain"
	domaintask "github.com/getbud-co/bud2/backend/internal/domain/task"
)

func handleError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, domaintask.ErrNotFound):
		httputil.WriteProblem(w, http.StatusNotFound, "Not Found", err.Error())
	case errors.Is(err, domaintask.ErrInvalidReference):
		httputil.WriteProblem(w, http.StatusUnprocessableEntity, "Unprocessable Entity", err.Error())
	case errors.Is(err, domain.ErrValidation):
		httputil.WriteProblem(w, http.StatusUnprocessableEntity, "Unprocessable Entity", err.Error())
	default:
		httputil.WriteProblem(w, http.StatusInternalServerError, "Internal Server Error", "an unexpected error occurred")
	}
}
