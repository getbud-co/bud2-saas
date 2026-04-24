package permission

import (
	"context"
	"net/http"

	"github.com/getbud-co/bud2/backend/internal/api/httputil"
	domainperm "github.com/getbud-co/bud2/backend/internal/domain/permission"
)

type listUseCase interface {
	Execute(ctx context.Context) ([]domainperm.Permission, error)
}

type Handler struct {
	list listUseCase
}

func NewHandler(list listUseCase) *Handler {
	return &Handler{list: list}
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	perms, err := h.list.Execute(r.Context())
	if err != nil {
		httputil.WriteProblem(w, http.StatusInternalServerError, "Internal Server Error", "an unexpected error occurred")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, toListResponse(perms))
}
