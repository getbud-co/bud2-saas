package user

import (
	"context"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/api/httputil"
	"github.com/getbud-co/bud2/backend/internal/api/validator"
	appuser "github.com/getbud-co/bud2/backend/internal/app/user"
	"github.com/getbud-co/bud2/backend/internal/domain"
	"github.com/getbud-co/bud2/backend/internal/domain/membership"
	usr "github.com/getbud-co/bud2/backend/internal/domain/user"
)

type createUseCase interface {
	Execute(ctx context.Context, cmd appuser.CreateCommand) (*usr.User, error)
}

type getUseCase interface {
	Execute(ctx context.Context, organizationID domain.TenantID, id uuid.UUID) (*usr.User, error)
}

type listUseCase interface {
	Execute(ctx context.Context, cmd appuser.ListCommand) (usr.ListResult, error)
}

type updateUseCase interface {
	Execute(ctx context.Context, cmd appuser.UpdateCommand) (*usr.User, error)
}

type getMembershipUseCase interface {
	Execute(ctx context.Context, organizationID domain.TenantID, id uuid.UUID) (*membership.Membership, error)
}

type updateMembershipUseCase interface {
	Execute(ctx context.Context, cmd appuser.UpdateMembershipCommand) (*membership.Membership, error)
}

type deleteUseCase interface {
	Execute(ctx context.Context, cmd appuser.DeleteCommand) error
}

type Handler struct {
	create           createUseCase
	get              getUseCase
	list             listUseCase
	update           updateUseCase
	delete           deleteUseCase
	getMembership    getMembershipUseCase
	updateMembership updateMembershipUseCase
}

func NewHandler(create createUseCase, get getUseCase, list listUseCase, update updateUseCase, delete deleteUseCase, getMembership getMembershipUseCase, updateMembership updateMembershipUseCase) *Handler {
	return &Handler{
		create:           create,
		get:              get,
		list:             list,
		update:           update,
		delete:           delete,
		getMembership:    getMembership,
		updateMembership: updateMembership,
	}
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

	cmd := appuser.ListCommand{OrganizationID: organizationID, Page: page, Size: size}
	if s := q.Get("status"); s != "" {
		cmd.Status = &s
	}

	result, err := h.list.Execute(r.Context(), cmd)
	if err != nil {
		httputil.WriteProblem(w, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	items := make([]Response, len(result.Users))
	for i := range result.Users {
		items[i] = toResponse(&result.Users[i])
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
	claims, err := domain.ClaimsFromContext(r.Context())
	if err != nil {
		httputil.WriteProblem(w, http.StatusUnauthorized, "Unauthorized", "authentication required")
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httputil.WriteProblem(w, http.StatusBadRequest, "Bad Request", "invalid id format")
		return
	}

	err = h.delete.Execute(r.Context(), appuser.DeleteCommand{
		OrganizationID:  organizationID,
		RequesterUserID: claims.UserID.UUID(),
		TargetUserID:    id,
	})
	if err != nil {
		handleError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) GetMembership(w http.ResponseWriter, r *http.Request) {
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

	result, err := h.getMembership.Execute(r.Context(), organizationID, id)
	if err != nil {
		handleError(w, err)
		return
	}
	httputil.WriteJSON(w, http.StatusOK, toMembershipResponse(result))
}

func (h *Handler) UpdateMembership(w http.ResponseWriter, r *http.Request) {
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

	var req updateMembershipRequest
	if !httputil.DecodeJSON(w, r, &req) {
		return
	}
	if err := validator.Validate(req); err != nil {
		httputil.WriteProblem(w, http.StatusUnprocessableEntity, "Validation Error", validator.FormatValidationErrors(err))
		return
	}

	result, err := h.updateMembership.Execute(r.Context(), req.toCommand(organizationID, id))
	if err != nil {
		handleError(w, err)
		return
	}
	httputil.WriteJSON(w, http.StatusOK, toMembershipResponse(result))
}
