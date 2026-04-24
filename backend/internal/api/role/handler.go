package role

import (
	"context"
	"net/http"

	"github.com/getbud-co/bud2/backend/internal/api/httputil"
	approle "github.com/getbud-co/bud2/backend/internal/app/role"
	"github.com/getbud-co/bud2/backend/internal/domain"
	domainrole "github.com/getbud-co/bud2/backend/internal/domain/role"
)

type listUseCase interface {
	Execute(ctx context.Context, cmd approle.ListCommand) ([]domainrole.Role, error)
}

type Handler struct {
	list listUseCase
}

func NewHandler(list listUseCase) *Handler {
	return &Handler{list: list}
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	organizationID, err := domain.TenantIDFromContext(r.Context())
	if err != nil {
		httputil.WriteProblem(w, http.StatusUnauthorized, "Unauthorized", err.Error())
		return
	}

	roles, err := h.list.Execute(r.Context(), approle.ListCommand{OrganizationID: organizationID})
	if err != nil {
		handleError(w, err)
		return
	}
	httputil.WriteJSON(w, http.StatusOK, toListResponse(roles))
}
