package checkin

import (
	"context"
	"fmt"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/api/httputil"
	"github.com/getbud-co/bud2/backend/internal/api/validator"
	appcheckin "github.com/getbud-co/bud2/backend/internal/app/checkin"
	"github.com/getbud-co/bud2/backend/internal/domain"
	domaincheckin "github.com/getbud-co/bud2/backend/internal/domain/checkin"
)

type createUseCase interface {
	Execute(ctx context.Context, cmd appcheckin.CreateCommand) (*domaincheckin.CheckIn, error)
}

type getUseCase interface {
	Execute(ctx context.Context, orgID domain.TenantID, id uuid.UUID) (*domaincheckin.CheckIn, error)
}

type listUseCase interface {
	Execute(ctx context.Context, cmd appcheckin.ListCommand) (domaincheckin.ListResult, error)
}

type updateUseCase interface {
	Execute(ctx context.Context, cmd appcheckin.UpdateCommand) (*domaincheckin.CheckIn, error)
}

type deleteUseCase interface {
	Execute(ctx context.Context, cmd appcheckin.DeleteCommand) error
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
	orgID, err := domain.TenantIDFromContext(r.Context())
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

	result, err := h.create.Execute(r.Context(), req.toCommand(orgID))
	if err != nil {
		handleError(w, err)
		return
	}
	w.Header().Set("Location", fmt.Sprintf("/checkins/%s", result.ID))
	httputil.WriteJSON(w, http.StatusCreated, toResponse(result))
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	orgID, err := domain.TenantIDFromContext(r.Context())
	if err != nil {
		httputil.WriteProblem(w, http.StatusUnauthorized, "Unauthorized", err.Error())
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httputil.WriteProblem(w, http.StatusBadRequest, "Bad Request", "invalid id format")
		return
	}

	result, err := h.get.Execute(r.Context(), orgID, id)
	if err != nil {
		handleError(w, err)
		return
	}
	httputil.WriteJSON(w, http.StatusOK, toResponse(result))
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	orgID, err := domain.TenantIDFromContext(r.Context())
	if err != nil {
		httputil.WriteProblem(w, http.StatusUnauthorized, "Unauthorized", err.Error())
		return
	}

	q := r.URL.Query()
	indicatorIDStr := q.Get("indicator_id")
	if indicatorIDStr == "" {
		httputil.WriteProblem(w, http.StatusBadRequest, "Bad Request", "indicator_id is required")
		return
	}
	indicatorID, err := uuid.Parse(indicatorIDStr)
	if err != nil {
		httputil.WriteProblem(w, http.StatusBadRequest, "Bad Request", "invalid indicator_id format")
		return
	}

	page, _ := strconv.Atoi(q.Get("page"))
	size, _ := strconv.Atoi(q.Get("size"))

	result, err := h.list.Execute(r.Context(), appcheckin.ListCommand{
		OrgID:       orgID,
		IndicatorID: indicatorID,
		Page:        page,
		Size:        size,
	})
	if err != nil {
		handleError(w, err)
		return
	}
	httputil.WriteJSON(w, http.StatusOK, toListResponse(result))
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	orgID, err := domain.TenantIDFromContext(r.Context())
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

	result, err := h.update.Execute(r.Context(), req.toCommand(orgID, id))
	if err != nil {
		handleError(w, err)
		return
	}
	httputil.WriteJSON(w, http.StatusOK, toResponse(result))
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	orgID, err := domain.TenantIDFromContext(r.Context())
	if err != nil {
		httputil.WriteProblem(w, http.StatusUnauthorized, "Unauthorized", err.Error())
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httputil.WriteProblem(w, http.StatusBadRequest, "Bad Request", "invalid id format")
		return
	}

	if err := h.delete.Execute(r.Context(), appcheckin.DeleteCommand{OrgID: orgID, ID: id}); err != nil {
		handleError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
