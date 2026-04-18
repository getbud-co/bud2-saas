package organization

import (
	"context"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/api/httputil"
	"github.com/getbud-co/bud2/backend/internal/api/validator"
	apporg "github.com/getbud-co/bud2/backend/internal/app/organization"
	org "github.com/getbud-co/bud2/backend/internal/domain/organization"
)

type createUseCase interface {
	Execute(ctx context.Context, cmd apporg.CreateCommand) (*org.Organization, error)
}

type getUseCase interface {
	Execute(ctx context.Context, id uuid.UUID) (*org.Organization, error)
}

type listUseCase interface {
	Execute(ctx context.Context, cmd apporg.ListCommand) (org.ListResult, error)
}

type updateUseCase interface {
	Execute(ctx context.Context, cmd apporg.UpdateCommand) (*org.Organization, error)
}

type Handler struct {
	create createUseCase
	get    getUseCase
	list   listUseCase
	update updateUseCase
}

func NewHandler(
	create createUseCase,
	get getUseCase,
	list listUseCase,
	update updateUseCase,
) *Handler {
	return &Handler{create: create, get: get, list: list, update: update}
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

	result, err := h.create.Execute(r.Context(), req.toCommand())
	if err != nil {
		handleError(w, err)
		return
	}

	httputil.WriteJSON(w, http.StatusCreated, toResponse(result))
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httputil.WriteProblem(w, http.StatusBadRequest, "Bad Request", "invalid id format")
		return
	}

	result, err := h.get.Execute(r.Context(), id)
	if err != nil {
		handleError(w, err)
		return
	}

	httputil.WriteJSON(w, http.StatusOK, toResponse(result))
}

const maxPageSize = 100

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
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

	cmd := apporg.ListCommand{Page: page, Size: size}
	if s := q.Get("status"); s != "" {
		cmd.Status = &s
	}

	result, err := h.list.Execute(r.Context(), cmd)
	if err != nil {
		httputil.WriteProblem(w, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	items := make([]Response, len(result.Organizations))
	for i := range result.Organizations {
		items[i] = toResponse(&result.Organizations[i])
	}

	httputil.WriteJSON(w, http.StatusOK, ListResponse{Data: items, Total: result.Total, Page: page, Size: size})
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
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

	result, err := h.update.Execute(r.Context(), req.toCommand(id))
	if err != nil {
		handleError(w, err)
		return
	}

	httputil.WriteJSON(w, http.StatusOK, toResponse(result))
}
