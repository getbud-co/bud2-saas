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

func (m *mockGetUseCase) Execute(ctx context.Context, cmd apporg.GetCommand) (*org.Organization, error) {
	args := m.Called(ctx, cmd)
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

type mockDeleteUseCase struct{ mock.Mock }

func (m *mockDeleteUseCase) Execute(ctx context.Context, cmd apporg.DeleteCommand) error {
	args := m.Called(ctx, cmd)
	return args.Error(0)
}

func TestHandler_Create_Success(t *testing.T) {
	createUC := new(mockCreateUseCase)
	handler := NewHandler(createUC, nil, nil, nil, nil)

	expected := fixtures.NewOrganization()
	createUC.On("Execute", mock.Anything, apporg.CreateCommand{
		Name: "Test Org", Domain: "example.com", Workspace: "example",
	}).Return(expected, nil)

	body, _ := json.Marshal(createRequest{Name: "Test Org", Domain: "example.com", Workspace: "example"})
	req := httptest.NewRequest(http.MethodPost, "/organizations", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handler.Create(rr, req)

	assert.Equal(t, http.StatusCreated, rr.Code)
	assert.Equal(t, "/organizations/"+expected.ID.String(), rr.Header().Get("Location"))
	var resp Response
	assert.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.Equal(t, expected.ID, resp.ID)
}

func TestHandler_Create_InvalidJSON(t *testing.T) {
	handler := NewHandler(new(mockCreateUseCase), nil, nil, nil, nil)

	req := httptest.NewRequest(http.MethodPost, "/organizations", bytes.NewReader([]byte("invalid")))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handler.Create(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestHandler_Create_ValidationError(t *testing.T) {
	handler := NewHandler(new(mockCreateUseCase), nil, nil, nil, nil)

	body, _ := json.Marshal(createRequest{Name: "T", Domain: "not a domain", Workspace: ""})
	req := httptest.NewRequest(http.MethodPost, "/organizations", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handler.Create(rr, req)

	assert.Equal(t, http.StatusUnprocessableEntity, rr.Code)
}

func TestHandler_Create_DomainConflict(t *testing.T) {
	createUC := new(mockCreateUseCase)
	handler := NewHandler(createUC, nil, nil, nil, nil)

	createUC.On("Execute", mock.Anything, mock.Anything).Return(nil, org.ErrDomainExists)

	body, _ := json.Marshal(createRequest{Name: "Test Org", Domain: "example.com", Workspace: "example"})
	req := httptest.NewRequest(http.MethodPost, "/organizations", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handler.Create(rr, req)

	assert.Equal(t, http.StatusConflict, rr.Code)
}

func TestHandler_Create_WorkspaceConflict(t *testing.T) {
	createUC := new(mockCreateUseCase)
	handler := NewHandler(createUC, nil, nil, nil, nil)

	createUC.On("Execute", mock.Anything, mock.Anything).Return(nil, org.ErrWorkspaceExists)

	body, _ := json.Marshal(createRequest{Name: "Test Org", Domain: "example.com", Workspace: "example"})
	req := httptest.NewRequest(http.MethodPost, "/organizations", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handler.Create(rr, req)

	assert.Equal(t, http.StatusConflict, rr.Code)
}

func TestHandler_Create_DomainValidationError(t *testing.T) {
	createUC := new(mockCreateUseCase)
	handler := NewHandler(createUC, nil, nil, nil, nil)

	createUC.On("Execute", mock.Anything, mock.Anything).Return(nil, domain.ErrValidation)

	body, _ := json.Marshal(createRequest{Name: "Test Org", Domain: "example.com", Workspace: "example"})
	req := httptest.NewRequest(http.MethodPost, "/organizations", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handler.Create(rr, req)

	assert.Equal(t, http.StatusUnprocessableEntity, rr.Code)
}

func TestHandler_Create_InternalError(t *testing.T) {
	createUC := new(mockCreateUseCase)
	handler := NewHandler(createUC, nil, nil, nil, nil)

	createUC.On("Execute", mock.Anything, mock.Anything).Return(nil, errors.New("internal error"))

	body, _ := json.Marshal(createRequest{Name: "Test Org", Domain: "example.com", Workspace: "example"})
	req := httptest.NewRequest(http.MethodPost, "/organizations", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handler.Create(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

func TestHandler_Get_Success(t *testing.T) {
	getUC := new(mockGetUseCase)
	handler := NewHandler(nil, getUC, nil, nil, nil)

	expected := fixtures.NewOrganization()
	claims := fixtures.NewTestUserClaims()
	getUC.On("Execute", mock.Anything, apporg.GetCommand{RequesterUserID: claims.UserID.UUID(), ID: expected.ID}).Return(expected, nil)

	req := httptest.NewRequest(http.MethodGet, "/organizations/"+expected.ID.String(), nil)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", expected.ID.String())
	req = req.WithContext(context.WithValue(fixtures.NewContextWithUserClaims(claims), chi.RouteCtxKey, rctx))
	rr := httptest.NewRecorder()

	handler.Get(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	var resp Response
	assert.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.Equal(t, expected.ID, resp.ID)
}

func TestHandler_Get_InvalidID(t *testing.T) {
	handler := NewHandler(nil, new(mockGetUseCase), nil, nil, nil)
	claims := fixtures.NewTestUserClaims()

	req := httptest.NewRequest(http.MethodGet, "/organizations/invalid", nil)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "invalid")
	req = req.WithContext(context.WithValue(fixtures.NewContextWithUserClaims(claims), chi.RouteCtxKey, rctx))
	rr := httptest.NewRecorder()

	handler.Get(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestHandler_Get_NotFound(t *testing.T) {
	getUC := new(mockGetUseCase)
	handler := NewHandler(nil, getUC, nil, nil, nil)

	id := uuid.New()
	claims := fixtures.NewTestUserClaims()
	getUC.On("Execute", mock.Anything, apporg.GetCommand{RequesterUserID: claims.UserID.UUID(), ID: id}).Return(nil, org.ErrNotFound)

	req := httptest.NewRequest(http.MethodGet, "/organizations/"+id.String(), nil)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", id.String())
	req = req.WithContext(context.WithValue(fixtures.NewContextWithUserClaims(claims), chi.RouteCtxKey, rctx))
	rr := httptest.NewRecorder()

	handler.Get(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

func TestHandler_List_Success(t *testing.T) {
	listUC := new(mockListUseCase)
	handler := NewHandler(nil, nil, listUC, nil, nil)

	orgs := fixtures.NewOrganizationList(2)
	claims := fixtures.NewTestUserClaims()
	listUC.On("Execute", mock.Anything, apporg.ListCommand{RequesterUserID: claims.UserID.UUID(), Page: 1, Size: 20}).Return(org.ListResult{
		Organizations: orgs, Total: 2,
	}, nil)

	req := httptest.NewRequest(http.MethodGet, "/organizations", nil)
	req = req.WithContext(fixtures.NewContextWithUserClaims(claims))
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
	handler := NewHandler(nil, nil, listUC, nil, nil)
	claims := fixtures.NewTestUserClaims()

	listUC.On("Execute", mock.Anything, apporg.ListCommand{RequesterUserID: claims.UserID.UUID(), Page: 2, Size: 10}).Return(org.ListResult{}, nil)

	req := httptest.NewRequest(http.MethodGet, "/organizations?page=2&size=10", nil)
	req = req.WithContext(fixtures.NewContextWithUserClaims(claims))
	rr := httptest.NewRecorder()

	handler.List(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	listUC.AssertExpectations(t)
}

func TestHandler_List_WithStatusFilter(t *testing.T) {
	listUC := new(mockListUseCase)
	handler := NewHandler(nil, nil, listUC, nil, nil)

	status := "active"
	claims := fixtures.NewTestUserClaims()
	listUC.On("Execute", mock.Anything, apporg.ListCommand{RequesterUserID: claims.UserID.UUID(), Page: 1, Size: 20, Status: &status}).Return(org.ListResult{}, nil)

	req := httptest.NewRequest(http.MethodGet, "/organizations?status=active", nil)
	req = req.WithContext(fixtures.NewContextWithUserClaims(claims))
	rr := httptest.NewRecorder()

	handler.List(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	listUC.AssertExpectations(t)
}

func TestHandler_Update_Success(t *testing.T) {
	updateUC := new(mockUpdateUseCase)
	handler := NewHandler(nil, nil, nil, updateUC, nil)

	expected := fixtures.NewOrganization()
	claims := fixtures.NewTestUserClaims()
	updateUC.On("Execute", mock.Anything, apporg.UpdateCommand{
		RequesterUserID: claims.UserID.UUID(), ID: expected.ID, Name: "Updated", Domain: "example.com", Workspace: "updated", Status: "active",
	}).Return(expected, nil)

	body, _ := json.Marshal(updateRequest{Name: "Updated", Domain: "example.com", Workspace: "updated", Status: "active"})
	req := httptest.NewRequest(http.MethodPut, "/organizations/"+expected.ID.String(), bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", expected.ID.String())
	req = req.WithContext(context.WithValue(fixtures.NewContextWithUserClaims(claims), chi.RouteCtxKey, rctx))
	rr := httptest.NewRecorder()

	handler.Update(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestHandler_Update_InvalidID(t *testing.T) {
	handler := NewHandler(nil, nil, nil, new(mockUpdateUseCase), nil)
	claims := fixtures.NewTestUserClaims()

	body, _ := json.Marshal(updateRequest{Name: "Updated", Domain: "example.com", Workspace: "updated", Status: "active"})
	req := httptest.NewRequest(http.MethodPut, "/organizations/invalid", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "invalid")
	req = req.WithContext(context.WithValue(fixtures.NewContextWithUserClaims(claims), chi.RouteCtxKey, rctx))
	rr := httptest.NewRecorder()

	handler.Update(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestHandler_Update_NotFound(t *testing.T) {
	updateUC := new(mockUpdateUseCase)
	handler := NewHandler(nil, nil, nil, updateUC, nil)

	id := uuid.New()
	claims := fixtures.NewTestUserClaims()
	updateUC.On("Execute", mock.Anything, mock.Anything).Return(nil, org.ErrNotFound)

	body, _ := json.Marshal(updateRequest{Name: "Updated", Domain: "example.com", Workspace: "updated", Status: "active"})
	req := httptest.NewRequest(http.MethodPut, "/organizations/"+id.String(), bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", id.String())
	req = req.WithContext(context.WithValue(fixtures.NewContextWithUserClaims(claims), chi.RouteCtxKey, rctx))
	rr := httptest.NewRecorder()

	handler.Update(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

func TestHandler_Update_InvalidJSON(t *testing.T) {
	handler := NewHandler(nil, nil, nil, new(mockUpdateUseCase), nil)
	claims := fixtures.NewTestUserClaims()

	id := uuid.New()
	req := httptest.NewRequest(http.MethodPut, "/organizations/"+id.String(), bytes.NewReader([]byte("invalid")))
	req.Header.Set("Content-Type", "application/json")
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", id.String())
	req = req.WithContext(context.WithValue(fixtures.NewContextWithUserClaims(claims), chi.RouteCtxKey, rctx))
	rr := httptest.NewRecorder()

	handler.Update(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestHandler_Delete_Success(t *testing.T) {
	deleteUC := new(mockDeleteUseCase)
	handler := NewHandler(nil, nil, nil, nil, deleteUC)

	id := uuid.New()
	claims := fixtures.NewTestUserClaims()
	claims.IsSystemAdmin = true
	deleteUC.On("Execute", mock.Anything, apporg.DeleteCommand{RequesterIsSystemAdmin: true, ID: id}).Return(nil)

	req := httptest.NewRequest(http.MethodDelete, "/organizations/"+id.String(), nil)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", id.String())
	req = req.WithContext(context.WithValue(fixtures.NewContextWithUserClaims(claims), chi.RouteCtxKey, rctx))
	rr := httptest.NewRecorder()

	handler.Delete(rr, req)

	assert.Equal(t, http.StatusNoContent, rr.Code)
}

func TestHandler_Delete_NotFound_IsIdempotent(t *testing.T) {
	deleteUC := new(mockDeleteUseCase)
	handler := NewHandler(nil, nil, nil, nil, deleteUC)

	id := uuid.New()
	claims := fixtures.NewTestUserClaims()
	claims.IsSystemAdmin = true
	deleteUC.On("Execute", mock.Anything, apporg.DeleteCommand{RequesterIsSystemAdmin: true, ID: id}).Return(org.ErrNotFound)

	req := httptest.NewRequest(http.MethodDelete, "/organizations/"+id.String(), nil)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", id.String())
	req = req.WithContext(context.WithValue(fixtures.NewContextWithUserClaims(claims), chi.RouteCtxKey, rctx))
	rr := httptest.NewRecorder()

	handler.Delete(rr, req)

	assert.Equal(t, http.StatusNoContent, rr.Code)
}
