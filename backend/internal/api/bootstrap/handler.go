package bootstrap

import (
	"context"
	"net/http"

	"github.com/getbud-co/bud2/backend/internal/api/httputil"
	"github.com/getbud-co/bud2/backend/internal/api/validator"
	appbootstrap "github.com/getbud-co/bud2/backend/internal/app/bootstrap"
)

type bootstrapUseCase interface {
	Execute(ctx context.Context, cmd appbootstrap.Command) (*appbootstrap.Result, error)
}

type Handler struct {
	uc bootstrapUseCase
}

func NewHandler(uc bootstrapUseCase) *Handler {
	return &Handler{uc: uc}
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var req createRequest
	if !httputil.DecodeJSON(w, r, &req) {
		return
	}

	if err := validator.Validate(req); err != nil {
		httputil.WriteProblem(w, http.StatusUnprocessableEntity, "Validation Error", validator.FormatValidationErrors(err))
		return
	}

	result, err := h.uc.Execute(r.Context(), req.toCommand())
	if err != nil {
		if !handleError(w, err) {
			httputil.WriteProblem(w, http.StatusInternalServerError, "Internal Server Error", "an unexpected error occurred")
		}
		return
	}

	resp := createBootstrapResponse(result)
	httputil.WriteJSON(w, http.StatusCreated, resp)
}
