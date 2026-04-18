package organization

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	apporg "github.com/getbud-co/bud2/backend/internal/app/organization"
	"github.com/getbud-co/bud2/backend/internal/domain"
	org "github.com/getbud-co/bud2/backend/internal/domain/organization"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
)

type mockCreateUseCase struct{ mock.Mock }

func (m *mockCreateUseCase) Execute(ctx context.Context, cmd apporg.CreateCommand) (*org.Organization, error) {
	args := m.Called(ctx, cmd)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*org.Organization), args.Error(1)
}

type mockGetUseCase struct{ mock.Mock }

func (m *mockGetUseCase) Execute(ctx context.Context, id uuid.UUID) (*org.Organization, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*org.Organization), args.Error(1)
}

type mockListUseCase struct{ mock.Mock }

func (m *mockListUseCase) Execute(ctx context.Context, cmd apporg.ListCommand) (org.ListResult, error) {
	args := m.Called(ctx, cmd)
	return args.Get(0).(org.ListResult), args.Error(1)
}

type mockUpdateUseCase struct{ mock.Mock }

func (m *mockUpdateUseCase) Execute(ctx context.Context, cmd apporg.UpdateCommand) (*org.Organization, error) {
	args := m.Called(ctx, cmd)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*org.Organization), args.Error(1)
}

func TestHandler_Create_Success(t *testing.T) {
	createUC := new(mockCreateUseCase)
	handler := NewHandler(createUC, nil, nil, nil)

	expected := fixtures.NewOrganization()
	createUC.On("Execute", mock.Anything, apporg.CreateCommand{
		Name: "Test Org", Domain: "admin@example.com", Workspace: "example",
	}).Return(expected, nil)

	body, _ := json.Marshal(createRequest{Name: "Test Org", Domain: "admin@example.com", Workspace: "example"})
	req := httptest.NewRequest(http.MethodPost, "/organizations", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handler.Create(rr, req)

	assert.Equal(t, http.StatusCreated, rr.Code)
	var resp Response
	assert.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.Equal(t, expected.ID, resp.ID)
}

func TestHandler_Create_InvalidJSON(t *testing.T) {
	handler := NewHandler(new(mockCreateUseCase), nil, nil, nil)

	req := httptest.NewRequest(http.MethodPost, "/organizations", bytes.NewReader([]byte("invalid")))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handler.Create(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestHandler_Create_ValidationError(t *testing.T) {
	handler := NewHandler(new(mockCreateUseCase), nil, nil, nil)

	body, _ := json.Marshal(createRequest{Name: "T", Domain: "not-email", Workspace: ""})
	req := httptest.NewRequest(http.MethodPost, "/organizations", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handler.Create(rr, req)

	assert.Equal(t, http.StatusUnprocessableEntity, rr.Code)
}

func TestHandler_Create_DomainConflict(t *testing.T) {
	createUC := new(mockCreateUseCase)
	handler := NewHandler(createUC, nil, nil, nil)

	createUC.On("Execute", mock.Anything, mock.Anything).Return(nil, org.ErrDomainExists)

	body, _ := json.Marshal(createRequest{Name: "Test Org", Domain: "admin@example.com", Workspace: "example"})
	req := httptest.NewRequest(http.MethodPost, "/organizations", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handler.Create(rr, req)

	assert.Equal(t, http.StatusConflict, rr.Code)
}

func TestHandler_Create_WorkspaceConflict(t *testing.T) {
	createUC := new(mockCreateUseCase)
	handler := NewHandler(createUC, nil, nil, nil)

	createUC.On("Execute", mock.Anything, mock.Anything).Return(nil, org.ErrWorkspaceExists)

	body, _ := json.Marshal(createRequest{Name: "Test Org", Domain: "admin@example.com", Workspace: "example"})
	req := httptest.NewRequest(http.MethodPost, "/organizations", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handler.Create(rr, req)

	assert.Equal(t, http.StatusConflict, rr.Code)
}

func TestHandler_Create_DomainValidationError(t *testing.T) {
	createUC := new(mockCreateUseCase)
	handler := NewHandler(createUC, nil, nil, nil)

	createUC.On("Execute", mock.Anything, mock.Anything).Return(nil, domain.ErrValidation)

	body, _ := json.Marshal(createRequest{Name: "Test Org", Domain: "admin@example.com", Workspace: "example"})
	req := httptest.NewRequest(http.MethodPost, "/organizations", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handler.Create(rr, req)

	assert.Equal(t, http.StatusUnprocessableEntity, rr.Code)
}

func TestHandler_Create_InternalError(t *testing.T) {
	createUC := new(mockCreateUseCase)
	handler := NewHandler(createUC, nil, nil, nil)

	createUC.On("Execute", mock.Anything, mock.Anything).Return(nil, errors.New("internal error"))

	body, _ := json.Marshal(createRequest{Name: "Test Org", Domain: "admin@example.com", Workspace: "example"})
	req := httptest.NewRequest(http.MethodPost, "/organizations", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handler.Create(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

func TestHandler_Get_Success(t *testing.T) {
	getUC := new(mockGetUseCase)
	handler := NewHandler(nil, getUC, nil, nil)

	expected := fixtures.NewOrganization()
	getUC.On("Execute", mock.Anything, expected.ID).Return(expected, nil)

	req := httptest.NewRequest(http.MethodGet, "/organizations/"+expected.ID.String(), nil)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", expected.ID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
	rr := httptest.NewRecorder()

	handler.Get(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	var resp Response
	assert.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.Equal(t, expected.ID, resp.ID)
}

func TestHandler_Get_InvalidID(t *testing.T) {
	handler := NewHandler(nil, new(mockGetUseCase), nil, nil)

	req := httptest.NewRequest(http.MethodGet, "/organizations/invalid", nil)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "invalid")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
	rr := httptest.NewRecorder()

	handler.Get(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestHandler_Get_NotFound(t *testing.T) {
	getUC := new(mockGetUseCase)
	handler := NewHandler(nil, getUC, nil, nil)

	id := uuid.New()
	getUC.On("Execute", mock.Anything, id).Return(nil, org.ErrNotFound)

	req := httptest.NewRequest(http.MethodGet, "/organizations/"+id.String(), nil)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", id.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
	rr := httptest.NewRecorder()

	handler.Get(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

func TestHandler_List_Success(t *testing.T) {
	listUC := new(mockListUseCase)
	handler := NewHandler(nil, nil, listUC, nil)

	orgs := fixtures.NewOrganizationList(2)
	listUC.On("Execute", mock.Anything, apporg.ListCommand{Page: 1, Size: 20}).Return(org.ListResult{
		Organizations: orgs, Total: 2,
	}, nil)

	req := httptest.NewRequest(http.MethodGet, "/organizations", nil)
	rr := httptest.NewRecorder()

	handler.List(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	var resp ListResponse
	assert.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.Len(t, resp.Data, 2)
	assert.Equal(t, int64(2), resp.Total)
}

func TestHandler_List_WithPagination(t *testing.T) {
	listUC := new(mockListUseCase)
	handler := NewHandler(nil, nil, listUC, nil)

	listUC.On("Execute", mock.Anything, apporg.ListCommand{Page: 2, Size: 10}).Return(org.ListResult{}, nil)

	req := httptest.NewRequest(http.MethodGet, "/organizations?page=2&size=10", nil)
	rr := httptest.NewRecorder()

	handler.List(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	listUC.AssertExpectations(t)
}

func TestHandler_List_WithStatusFilter(t *testing.T) {
	listUC := new(mockListUseCase)
	handler := NewHandler(nil, nil, listUC, nil)

	status := "active"
	listUC.On("Execute", mock.Anything, apporg.ListCommand{Page: 1, Size: 20, Status: &status}).Return(org.ListResult{}, nil)

	req := httptest.NewRequest(http.MethodGet, "/organizations?status=active", nil)
	rr := httptest.NewRecorder()

	handler.List(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	listUC.AssertExpectations(t)
}

func TestHandler_Update_Success(t *testing.T) {
	updateUC := new(mockUpdateUseCase)
	handler := NewHandler(nil, nil, nil, updateUC)

	expected := fixtures.NewOrganization()
	updateUC.On("Execute", mock.Anything, apporg.UpdateCommand{
		ID: expected.ID, Name: "Updated", Domain: "admin@example.com", Workspace: "updated", Status: "active",
	}).Return(expected, nil)

	body, _ := json.Marshal(updateRequest{Name: "Updated", Domain: "admin@example.com", Workspace: "updated", Status: "active"})
	req := httptest.NewRequest(http.MethodPut, "/organizations/"+expected.ID.String(), bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", expected.ID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
	rr := httptest.NewRecorder()

	handler.Update(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestHandler_Update_InvalidID(t *testing.T) {
	handler := NewHandler(nil, nil, nil, new(mockUpdateUseCase))

	body, _ := json.Marshal(updateRequest{Name: "Updated", Domain: "admin@example.com", Workspace: "updated", Status: "active"})
	req := httptest.NewRequest(http.MethodPut, "/organizations/invalid", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "invalid")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
	rr := httptest.NewRecorder()

	handler.Update(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestHandler_Update_NotFound(t *testing.T) {
	updateUC := new(mockUpdateUseCase)
	handler := NewHandler(nil, nil, nil, updateUC)

	id := uuid.New()
	updateUC.On("Execute", mock.Anything, mock.Anything).Return(nil, org.ErrNotFound)

	body, _ := json.Marshal(updateRequest{Name: "Updated", Domain: "admin@example.com", Workspace: "updated", Status: "active"})
	req := httptest.NewRequest(http.MethodPut, "/organizations/"+id.String(), bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", id.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
	rr := httptest.NewRecorder()

	handler.Update(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

func TestHandler_Update_InvalidJSON(t *testing.T) {
	handler := NewHandler(nil, nil, nil, new(mockUpdateUseCase))

	id := uuid.New()
	req := httptest.NewRequest(http.MethodPut, "/organizations/"+id.String(), bytes.NewReader([]byte("invalid")))
	req.Header.Set("Content-Type", "application/json")
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", id.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
	rr := httptest.NewRecorder()

	handler.Update(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}
