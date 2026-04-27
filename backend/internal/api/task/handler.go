package task

import (
	"context"
	"fmt"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/api/httputil"
	"github.com/getbud-co/bud2/backend/internal/api/validator"
	apptask "github.com/getbud-co/bud2/backend/internal/app/task"
	"github.com/getbud-co/bud2/backend/internal/domain"
	domaintask "github.com/getbud-co/bud2/backend/internal/domain/task"
)

type createUseCase interface {
	Execute(ctx context.Context, cmd apptask.CreateCommand) (*domaintask.Task, error)
}

type getUseCase interface {
	Execute(ctx context.Context, organizationID domain.TenantID, id uuid.UUID) (*domaintask.Task, error)
}

type listUseCase interface {
	Execute(ctx context.Context, cmd apptask.ListCommand) (domaintask.ListResult, error)
}

type updateUseCase interface {
	Execute(ctx context.Context, cmd apptask.UpdateCommand) (*domaintask.Task, error)
}

type deleteUseCase interface {
	Execute(ctx context.Context, cmd apptask.DeleteCommand) error
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
	w.Header().Set("Location", fmt.Sprintf("/tasks/%s", result.ID))
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
	cmd := apptask.ListCommand{OrganizationID: organizationID, Page: page, Size: size}
	if s := q.Get("status"); s != "" {
		if !domaintask.Status(s).IsValid() {
			httputil.WriteProblem(w, http.StatusBadRequest, "Bad Request", "status must be one of: todo, in_progress, done, cancelled")
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
	if v := q.Get("assignee_id"); v != "" {
		id, parseErr := uuid.Parse(v)
		if parseErr != nil {
			httputil.WriteProblem(w, http.StatusBadRequest, "Bad Request", "invalid assignee_id format")
			return
		}
		cmd.AssigneeID = &id
	}

	result, err := h.list.Execute(r.Context(), cmd)
	if err != nil {
		handleError(w, err)
		return
	}

	items := make([]Response, len(result.Tasks))
	for i := range result.Tasks {
		items[i] = toResponse(&result.Tasks[i])
	}
	httputil.WriteJSON(w, http.StatusOK, ListResponse{Data: items, Total: result.Total, Page: result.Page, Size: result.Size})
}

// Update applies a JSON Merge Patch to a task. Bound to PATCH at the router.
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

	if err := h.delete.Execute(r.Context(), apptask.DeleteCommand{OrganizationID: organizationID, ID: id}); err != nil {
		handleError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
