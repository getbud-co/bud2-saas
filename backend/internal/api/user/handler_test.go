package user

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

	appuser "github.com/getbud-co/bud2/backend/internal/app/user"
	"github.com/getbud-co/bud2/backend/internal/domain"
	"github.com/getbud-co/bud2/backend/internal/domain/membership"
	"github.com/getbud-co/bud2/backend/internal/domain/team"
	usr "github.com/getbud-co/bud2/backend/internal/domain/user"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
)

type mockCreateUseCase struct{ mock.Mock }

func (m *mockCreateUseCase) Execute(ctx context.Context, cmd appuser.CreateCommand) (*usr.User, []uuid.UUID, error) {
	args := m.Called(ctx, cmd)
	if args.Get(0) == nil {
		return nil, nil, args.Error(2)
	}
	var teamIDs []uuid.UUID
	if args.Get(1) != nil {
		teamIDs = args.Get(1).([]uuid.UUID)
	}
	return args.Get(0).(*usr.User), teamIDs, args.Error(2)
}

type mockGetUseCase struct{ mock.Mock }

func (m *mockGetUseCase) Execute(ctx context.Context, organizationID domain.TenantID, id uuid.UUID) (*usr.User, error) {
	args := m.Called(ctx, organizationID, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*usr.User), args.Error(1)
}

type mockListUseCase struct{ mock.Mock }

func (m *mockListUseCase) Execute(ctx context.Context, cmd appuser.ListCommand) (usr.ListResult, error) {
	args := m.Called(ctx, cmd)
	return args.Get(0).(usr.ListResult), args.Error(1)
}

type mockUpdateUseCase struct{ mock.Mock }

func (m *mockUpdateUseCase) Execute(ctx context.Context, cmd appuser.UpdateCommand) (*usr.User, []uuid.UUID, error) {
	args := m.Called(ctx, cmd)
	if args.Get(0) == nil {
		return nil, nil, args.Error(2)
	}
	var teamIDs []uuid.UUID
	if args.Get(1) != nil {
		teamIDs = args.Get(1).([]uuid.UUID)
	}
	return args.Get(0).(*usr.User), teamIDs, args.Error(2)
}

type mockDeleteUseCase struct{ mock.Mock }

func (m *mockDeleteUseCase) Execute(ctx context.Context, cmd appuser.DeleteCommand) error {
	args := m.Called(ctx, cmd)
	return args.Error(0)
}

type mockGetMembershipUseCase struct{ mock.Mock }

func (m *mockGetMembershipUseCase) Execute(ctx context.Context, organizationID domain.TenantID, id uuid.UUID) (*membership.Membership, error) {
	args := m.Called(ctx, organizationID, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*membership.Membership), args.Error(1)
}

type mockUpdateMembershipUseCase struct{ mock.Mock }

func (m *mockUpdateMembershipUseCase) Execute(ctx context.Context, cmd appuser.UpdateMembershipCommand) (*membership.Membership, error) {
	args := m.Called(ctx, cmd)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*membership.Membership), args.Error(1)
}

type mockTeamLister struct{ mock.Mock }

func (m *mockTeamLister) ListMembersByUser(ctx context.Context, organizationID, userID uuid.UUID) ([]team.TeamMember, error) {
	args := m.Called(ctx, organizationID, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]team.TeamMember), args.Error(1)
}

func (m *mockTeamLister) ListTeamIDsByUsers(ctx context.Context, organizationID uuid.UUID, userIDs []uuid.UUID) (map[uuid.UUID][]uuid.UUID, error) {
	args := m.Called(ctx, organizationID, userIDs)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(map[uuid.UUID][]uuid.UUID), args.Error(1)
}

func newMockTeamLister() *mockTeamLister {
	m := new(mockTeamLister)
	m.On("ListMembersByUser", mock.Anything, mock.Anything, mock.Anything).Return([]team.TeamMember{}, nil).Maybe()
	m.On("ListTeamIDsByUsers", mock.Anything, mock.Anything, mock.Anything).Return(map[uuid.UUID][]uuid.UUID{}, nil).Maybe()
	return m
}

func routeRequest(req *http.Request, tenantID domain.TenantID, id string) *http.Request {
	rctx := chi.NewRouteContext()
	if id != "" {
		rctx.URLParams.Add("id", id)
	}
	ctx := domain.TenantIDToContext(req.Context(), tenantID)
	return req.WithContext(context.WithValue(ctx, chi.RouteCtxKey, rctx))
}

func TestHandler_Create_Success(t *testing.T) {
	createUC := new(mockCreateUseCase)
	handler := NewHandler(createUC, nil, nil, nil, nil, nil, nil, newMockTeamLister())

	tenantID := fixtures.NewTestTenantID()
	u := fixtures.NewUser()
	createUC.On("Execute", mock.Anything, appuser.CreateCommand{
		OrganizationID: tenantID,
		FirstName:      "Test",
		LastName:       "User",
		Email:          "test@example.com",
		Password:       "password123",
		Role:           "super-admin",
	}).Return(u, []uuid.UUID{}, nil)

	body, _ := json.Marshal(createRequest{FirstName: "Test", LastName: "User", Email: "test@example.com", Password: "password123", Role: "super-admin"})
	req := httptest.NewRequest(http.MethodPost, "/users", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(fixtures.NewContextWithTenant(tenantID))
	rr := httptest.NewRecorder()

	handler.Create(rr, req)

	assert.Equal(t, http.StatusCreated, rr.Code)
	assert.Equal(t, "/users/"+u.ID.String(), rr.Header().Get("Location"))
	var resp Response
	assert.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.Equal(t, u.ID.String(), resp.ID)
	assert.Equal(t, u.Email, resp.Email)
}

func TestHandler_Get_Success(t *testing.T) {
	getUC := new(mockGetUseCase)
	handler := NewHandler(nil, getUC, nil, nil, nil, nil, nil, newMockTeamLister())

	tenantID := fixtures.NewTestTenantID()
	u := fixtures.NewUser()
	getUC.On("Execute", mock.Anything, tenantID, u.ID).Return(u, nil)

	req := httptest.NewRequest(http.MethodGet, "/users/"+u.ID.String(), nil)
	req = routeRequest(req, tenantID, u.ID.String())
	rr := httptest.NewRecorder()

	handler.Get(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	var resp Response
	assert.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.Equal(t, u.ID.String(), resp.ID)
	assert.Equal(t, u.Email, resp.Email)
}

func TestHandler_List_Success(t *testing.T) {
	listUC := new(mockListUseCase)
	handler := NewHandler(nil, nil, listUC, nil, nil, nil, nil, newMockTeamLister())

	tenantID := fixtures.NewTestTenantID()
	u := fixtures.NewUser()
	listUC.On("Execute", mock.Anything, appuser.ListCommand{
		OrganizationID: tenantID,
		Page:           1,
		Size:           20,
	}).Return(usr.ListResult{Users: []usr.User{*u}, Total: 1}, nil)

	req := httptest.NewRequest(http.MethodGet, "/users", nil)
	req = req.WithContext(fixtures.NewContextWithTenant(tenantID))
	rr := httptest.NewRecorder()

	handler.List(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	var resp ListResponse
	assert.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.Len(t, resp.Data, 1)
	assert.Equal(t, u.ID.String(), resp.Data[0].ID)
}

func TestHandler_Update_Success(t *testing.T) {
	updateUC := new(mockUpdateUseCase)
	handler := NewHandler(nil, nil, nil, updateUC, nil, nil, nil, newMockTeamLister())

	tenantID := fixtures.NewTestTenantID()
	u := fixtures.NewUser()
	updateUC.On("Execute", mock.Anything, appuser.UpdateCommand{
		OrganizationID: tenantID,
		ID:             u.ID,
		FirstName:      "Updated",
		LastName:       "Name",
		Email:          "test@example.com",
		Status:         "active",
	}).Return(u, []uuid.UUID{}, nil)

	body, _ := json.Marshal(updateRequest{FirstName: "Updated", LastName: "Name", Email: "test@example.com", Status: "active"})
	req := httptest.NewRequest(http.MethodPut, "/users/"+u.ID.String(), bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = routeRequest(req, tenantID, u.ID.String())
	rr := httptest.NewRecorder()

	handler.Update(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestHandler_Delete_Success(t *testing.T) {
	deleteUC := new(mockDeleteUseCase)
	handler := NewHandler(nil, nil, nil, nil, deleteUC, nil, nil, newMockTeamLister())

	tenantID := fixtures.NewTestTenantID()
	requesterID := uuid.New()
	targetID := uuid.New()
	claims := domain.UserClaims{
		UserID:                domain.UserID(requesterID),
		ActiveOrganizationID:  tenantID,
		HasActiveOrganization: true,
	}
	deleteUC.On("Execute", mock.Anything, appuser.DeleteCommand{
		OrganizationID:  tenantID,
		RequesterUserID: requesterID,
		TargetUserID:    targetID,
	}).Return(nil)

	req := httptest.NewRequest(http.MethodDelete, "/users/"+targetID.String(), nil)
	req = req.WithContext(fixtures.NewContextWithUserClaims(claims))
	req = routeRequest(req, tenantID, targetID.String())
	rr := httptest.NewRecorder()

	handler.Delete(rr, req)

	assert.Equal(t, http.StatusNoContent, rr.Code)
}

func TestHandler_Delete_NotFound_IsIdempotent(t *testing.T) {
	deleteUC := new(mockDeleteUseCase)
	handler := NewHandler(nil, nil, nil, nil, deleteUC, nil, nil, newMockTeamLister())

	tenantID := fixtures.NewTestTenantID()
	requesterID := uuid.New()
	targetID := uuid.New()
	claims := domain.UserClaims{
		UserID:                domain.UserID(requesterID),
		ActiveOrganizationID:  tenantID,
		HasActiveOrganization: true,
	}
	deleteUC.On("Execute", mock.Anything, appuser.DeleteCommand{
		OrganizationID:  tenantID,
		RequesterUserID: requesterID,
		TargetUserID:    targetID,
	}).Return(usr.ErrNotFound)

	req := httptest.NewRequest(http.MethodDelete, "/users/"+targetID.String(), nil)
	req = req.WithContext(fixtures.NewContextWithUserClaims(claims))
	req = routeRequest(req, tenantID, targetID.String())
	rr := httptest.NewRecorder()

	handler.Delete(rr, req)

	assert.Equal(t, http.StatusNoContent, rr.Code)
}

func TestHandler_GetMembership_Success(t *testing.T) {
	getMembershipUC := new(mockGetMembershipUseCase)
	handler := NewHandler(nil, nil, nil, nil, nil, getMembershipUC, nil, newMockTeamLister())

	tenantID := fixtures.NewTestTenantID()
	m := fixtures.NewMembership()
	getMembershipUC.On("Execute", mock.Anything, tenantID, m.UserID).Return(m, nil)

	req := httptest.NewRequest(http.MethodGet, "/users/"+m.UserID.String()+"/membership", nil)
	req = routeRequest(req, tenantID, m.UserID.String())
	rr := httptest.NewRecorder()

	handler.GetMembership(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	var resp MembershipResponse
	assert.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.Equal(t, m.ID.String(), resp.ID)
}

func TestHandler_UpdateMembership_Success(t *testing.T) {
	updateMembershipUC := new(mockUpdateMembershipUseCase)
	handler := NewHandler(nil, nil, nil, nil, nil, nil, updateMembershipUC, newMockTeamLister())

	tenantID := fixtures.NewTestTenantID()
	m := fixtures.NewMembership()
	updateMembershipUC.On("Execute", mock.Anything, appuser.UpdateMembershipCommand{
		OrganizationID: tenantID,
		ID:             m.UserID,
		Role:           "gestor",
		Status:         "active",
	}).Return(m, nil)

	body, _ := json.Marshal(updateMembershipRequest{Role: "gestor", Status: "active"})
	req := httptest.NewRequest(http.MethodPut, "/users/"+m.UserID.String()+"/membership", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = routeRequest(req, tenantID, m.UserID.String())
	rr := httptest.NewRecorder()

	handler.UpdateMembership(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestHandler_Get_NotFound(t *testing.T) {
	getUC := new(mockGetUseCase)
	handler := NewHandler(nil, getUC, nil, nil, nil, nil, nil, newMockTeamLister())

	tenantID := fixtures.NewTestTenantID()
	id := uuid.New()
	getUC.On("Execute", mock.Anything, tenantID, id).Return(nil, usr.ErrNotFound)

	req := httptest.NewRequest(http.MethodGet, "/users/"+id.String(), nil)
	req = routeRequest(req, tenantID, id.String())
	rr := httptest.NewRecorder()

	handler.Get(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

func TestHandler_Create_MembershipConflict(t *testing.T) {
	createUC := new(mockCreateUseCase)
	handler := NewHandler(createUC, nil, nil, nil, nil, nil, nil, newMockTeamLister())

	tenantID := fixtures.NewTestTenantID()
	createUC.On("Execute", mock.Anything, mock.Anything).Return(nil, nil, membership.ErrAlreadyExists)

	body, _ := json.Marshal(createRequest{FirstName: "Test", LastName: "User", Email: "test@example.com", Password: "password123", Role: "super-admin"})
	req := httptest.NewRequest(http.MethodPost, "/users", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(fixtures.NewContextWithTenant(tenantID))
	rr := httptest.NewRecorder()

	handler.Create(rr, req)

	assert.Equal(t, http.StatusConflict, rr.Code)
}

func TestHandler_Create_InternalError(t *testing.T) {
	createUC := new(mockCreateUseCase)
	handler := NewHandler(createUC, nil, nil, nil, nil, nil, nil, newMockTeamLister())

	tenantID := fixtures.NewTestTenantID()
	createUC.On("Execute", mock.Anything, mock.Anything).Return(nil, nil, errors.New("internal error"))

	body, _ := json.Marshal(createRequest{FirstName: "Test", LastName: "User", Email: "test@example.com", Password: "password123", Role: "super-admin"})
	req := httptest.NewRequest(http.MethodPost, "/users", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(fixtures.NewContextWithTenant(tenantID))
	rr := httptest.NewRecorder()

	handler.Create(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}
