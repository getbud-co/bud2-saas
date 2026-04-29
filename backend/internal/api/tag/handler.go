package tag

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/api/httputil"
	"github.com/getbud-co/bud2/backend/internal/api/validator"
	apptag "github.com/getbud-co/bud2/backend/internal/app/tag"
	"github.com/getbud-co/bud2/backend/internal/domain"
	domaintag "github.com/getbud-co/bud2/backend/internal/domain/tag"
)

type createUseCase interface {
	Execute(ctx context.Context, cmd apptag.CreateCommand) (*domaintag.Tag, error)
}

type getUseCase interface {
	Execute(ctx context.Context, organizationID domain.TenantID, id uuid.UUID) (*domaintag.Tag, error)
}

type listUseCase interface {
	Execute(ctx context.Context, cmd apptag.ListCommand) (domaintag.ListResult, error)
}

type updateUseCase interface {
	Execute(ctx context.Context, cmd apptag.UpdateCommand) (*domaintag.Tag, error)
}

type deleteUseCase interface {
	Execute(ctx context.Context, cmd apptag.DeleteCommand) error
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
	w.Header().Set("Location", fmt.Sprintf("/tags/%s", result.ID))
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

const maxPageSize = 100

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	organizationID, err := domain.TenantIDFromContext(r.Context())
	if err != nil {
		httputil.WriteProblem(w, http.StatusUnauthorized, "Unauthorized", err.Error())
		return
	}

	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	size, _ := strconv.Atoi(q.Get("size"))
	if page <= 0 {
		page = 1
	}
	if size <= 0 {
		size = 20
	}
	if size > maxPageSize {
		size = maxPageSize
	}

	result, err := h.list.Execute(r.Context(), apptag.ListCommand{OrganizationID: organizationID, Page: page, Size: size})
	if err != nil {
		handleError(w, err)
		return
	}

	items := make([]Response, len(result.Tags))
	for i := range result.Tags {
		items[i] = toResponse(&result.Tags[i])
	}
	httputil.WriteJSON(w, http.StatusOK, ListResponse{Data: items, Total: result.Total, Page: page, Size: size})
}

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

	if err := h.delete.Execute(r.Context(), apptag.DeleteCommand{OrganizationID: organizationID, ID: id}); err != nil {
		if errors.Is(err, domaintag.ErrNotFound) {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		handleError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
