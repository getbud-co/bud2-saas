package indicator

import (
	"context"
	"fmt"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/api/httputil"
	"github.com/getbud-co/bud2/backend/internal/api/validator"
	appindicator "github.com/getbud-co/bud2/backend/internal/app/indicator"
	"github.com/getbud-co/bud2/backend/internal/domain"
	domainindicator "github.com/getbud-co/bud2/backend/internal/domain/indicator"
)

type createUseCase interface {
	Execute(ctx context.Context, cmd appindicator.CreateCommand) (*domainindicator.Indicator, error)
}

type getUseCase interface {
	Execute(ctx context.Context, organizationID domain.TenantID, id uuid.UUID) (*domainindicator.Indicator, error)
}

type listUseCase interface {
	Execute(ctx context.Context, cmd appindicator.ListCommand) (domainindicator.ListResult, error)
}

type updateUseCase interface {
	Execute(ctx context.Context, cmd appindicator.UpdateCommand) (*domainindicator.Indicator, error)
}

type deleteUseCase interface {
	Execute(ctx context.Context, cmd appindicator.DeleteCommand) error
}

type Handler struct {
	create createUseCase
	get    getUseCase
	list   listUseCase
	update updateUseCase
	delete deleteUseCase
}

func NewHandler(create createUseCase, get getUseCase, list listUseCase, update updateUseCase, delete deleteUseCase) *Handler {
	return &Handler{create: create, get: get, list: list, update: update, delete: delete}
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	organizationID, err := domain.TenantIDFromContext(r.Context())
	if err != nil {
		httputil.WriteProblem(w, http.StatusUnauthorized, "Unauthorized", err.Error())
		return
	}

	var req createRequest
	if !httputil.DecodeJSON(w, r, &req) {
		return
	}
	if err := validator.Validate(req); err != nil {
		httputil.WriteProblem(w, http.StatusUnprocessableEntity, "Validation Error", validator.FormatValidationErrors(err))
		return
	}

	result, err := h.create.Execute(r.Context(), req.toCommand(organizationID))
	if err != nil {
		handleError(w, err)
		return
	}
	w.Header().Set("Location", fmt.Sprintf("/indicators/%s", result.ID))
	httputil.WriteJSON(w, http.StatusCreated, toResponse(result))
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	organizationID, err := domain.TenantIDFromContext(r.Context())
	if err != nil {
		httputil.WriteProblem(w, http.StatusUnauthorized, "Unauthorized", err.Error())
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httputil.WriteProblem(w, http.StatusBadRequest, "Bad Request", "invalid id format")
		return
	}

	result, err := h.get.Execute(r.Context(), organizationID, id)
	if err != nil {
		handleError(w, err)
		return
	}
	httputil.WriteJSON(w, http.StatusOK, toResponse(result))
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	organizationID, err := domain.TenantIDFromContext(r.Context())
	if err != nil {
		httputil.WriteProblem(w, http.StatusUnauthorized, "Unauthorized", err.Error())
		return
	}

	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	size, _ := strconv.Atoi(q.Get("size"))
	cmd := appindicator.ListCommand{OrganizationID: organizationID, Page: page, Size: size}
	if s := q.Get("status"); s != "" {
		if !domainindicator.Status(s).IsValid() {
			httputil.WriteProblem(w, http.StatusBadRequest, "Bad Request", "status must be one of: draft, active, at_risk, done, archived")
			return
		}
		cmd.Status = &s
	}
	if v := q.Get("mission_id"); v != "" {
		id, parseErr := uuid.Parse(v)
		if parseErr != nil {
			httputil.WriteProblem(w, http.StatusBadRequest, "Bad Request", "invalid mission_id format")
			return
		}
		cmd.MissionID = &id
	}
	if v := q.Get("owner_id"); v != "" {
		id, parseErr := uuid.Parse(v)
		if parseErr != nil {
			httputil.WriteProblem(w, http.StatusBadRequest, "Bad Request", "invalid owner_id format")
			return
		}
		cmd.OwnerID = &id
	}

	result, err := h.list.Execute(r.Context(), cmd)
	if err != nil {
		handleError(w, err)
		return
	}

	items := make([]Response, len(result.Indicators))
	for i := range result.Indicators {
		items[i] = toResponse(&result.Indicators[i])
	}
	httputil.WriteJSON(w, http.StatusOK, ListResponse{Data: items, Total: result.Total, Page: result.Page, Size: result.Size})
}

// Update applies a JSON Merge Patch to an indicator. Bound to PATCH at the
// router; "Update" here is the domain operation, not the HTTP verb.
func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	organizationID, err := domain.TenantIDFromContext(r.Context())
	if err != nil {
		httputil.WriteProblem(w, http.StatusUnauthorized, "Unauthorized", err.Error())
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httputil.WriteProblem(w, http.StatusBadRequest, "Bad Request", "invalid id format")
		return
	}

	var req updateRequest
	if !httputil.DecodeJSON(w, r, &req) {
		return
	}
	if err := validator.Validate(req); err != nil {
		httputil.WriteProblem(w, http.StatusUnprocessableEntity, "Validation Error", validator.FormatValidationErrors(err))
		return
	}
	if req.isEmpty() {
		httputil.WriteProblem(w, http.StatusBadRequest, "Bad Request", "patch body must contain at least one field")
		return
	}

	result, err := h.update.Execute(r.Context(), req.toCommand(organizationID, id))
	if err != nil {
		handleError(w, err)
		return
	}
	httputil.WriteJSON(w, http.StatusOK, toResponse(result))
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	organizationID, err := domain.TenantIDFromContext(r.Context())
	if err != nil {
		httputil.WriteProblem(w, http.StatusUnauthorized, "Unauthorized", err.Error())
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httputil.WriteProblem(w, http.StatusBadRequest, "Bad Request", "invalid id format")
		return
	}

	if err := h.delete.Execute(r.Context(), appindicator.DeleteCommand{OrganizationID: organizationID, ID: id}); err != nil {
		handleError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
