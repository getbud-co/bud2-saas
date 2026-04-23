package team

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	appteam "github.com/getbud-co/bud2/backend/internal/app/team"
	"github.com/getbud-co/bud2/backend/internal/domain"
	domainteam "github.com/getbud-co/bud2/backend/internal/domain/team"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
)

type mockTeamCreateUseCase struct{ mock.Mock }

func (m *mockTeamCreateUseCase) Execute(ctx context.Context, cmd appteam.CreateCommand) (*domainteam.Team, error) {
	args := m.Called(ctx, cmd)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domainteam.Team), args.Error(1)
}

type mockTeamGetUseCase struct{ mock.Mock }

func (m *mockTeamGetUseCase) Execute(ctx context.Context, organizationID domain.TenantID, id uuid.UUID) (*domainteam.Team, error) {
	args := m.Called(ctx, organizationID, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domainteam.Team), args.Error(1)
}

type mockTeamListUseCase struct{ mock.Mock }

func (m *mockTeamListUseCase) Execute(ctx context.Context, cmd appteam.ListCommand) (domainteam.ListResult, error) {
	args := m.Called(ctx, cmd)
	return args.Get(0).(domainteam.ListResult), args.Error(1)
}

type mockTeamUpdateUseCase struct{ mock.Mock }

func (m *mockTeamUpdateUseCase) Execute(ctx context.Context, cmd appteam.UpdateCommand) (*domainteam.Team, error) {
	args := m.Called(ctx, cmd)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domainteam.Team), args.Error(1)
}

type mockTeamDeleteUseCase struct{ mock.Mock }

func (m *mockTeamDeleteUseCase) Execute(ctx context.Context, cmd appteam.DeleteCommand) error {
	args := m.Called(ctx, cmd)
	return args.Error(0)
}

func routeTeamRequest(req *http.Request, tenantID domain.TenantID, id string) *http.Request {
	rctx := chi.NewRouteContext()
	if id != "" {
		rctx.URLParams.Add("id", id)
	}
	ctx := domain.TenantIDToContext(req.Context(), tenantID)
	return req.WithContext(context.WithValue(ctx, chi.RouteCtxKey, rctx))
}

func TestHandler_Delete_Success(t *testing.T) {
	deleteUC := new(mockTeamDeleteUseCase)
	handler := NewHandler(nil, nil, nil, nil, deleteUC)

	tenantID := fixtures.NewTestTenantID()
	id := uuid.New()
	deleteUC.On("Execute", mock.Anything, appteam.DeleteCommand{OrganizationID: tenantID, ID: id}).Return(nil)

	req := httptest.NewRequest(http.MethodDelete, "/teams/"+id.String(), nil)
	req = routeTeamRequest(req, tenantID, id.String())
	rr := httptest.NewRecorder()

	handler.Delete(rr, req)

	assert.Equal(t, http.StatusNoContent, rr.Code)
}

func TestHandler_Create_Success(t *testing.T) {
	createUC := new(mockTeamCreateUseCase)
	handler := NewHandler(createUC, nil, nil, nil, nil)

	tenantID := fixtures.NewTestTenantID()
	expected := &domainteam.Team{
		ID:             uuid.New(),
		OrganizationID: tenantID.UUID(),
		Name:           "Engineering",
		Color:          domainteam.ColorNeutral,
		Status:         domainteam.StatusActive,
	}
	createUC.On("Execute", mock.Anything, mock.Anything).Return(expected, nil)

	body := []byte(`{"name":"Engineering","color":"neutral"}`)
	req := httptest.NewRequest(http.MethodPost, "/teams", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(domain.TenantIDToContext(req.Context(), tenantID))
	rr := httptest.NewRecorder()

	handler.Create(rr, req)

	assert.Equal(t, http.StatusCreated, rr.Code)
	assert.Equal(t, "/teams/"+expected.ID.String(), rr.Header().Get("Location"))
	var resp Response
	assert.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.Equal(t, expected.ID.String(), resp.ID)
}

func TestHandler_Delete_NotFound_IsIdempotent(t *testing.T) {
	deleteUC := new(mockTeamDeleteUseCase)
	handler := NewHandler(nil, nil, nil, nil, deleteUC)

	tenantID := fixtures.NewTestTenantID()
	id := uuid.New()
	deleteUC.On("Execute", mock.Anything, appteam.DeleteCommand{OrganizationID: tenantID, ID: id}).Return(domainteam.ErrNotFound)

	req := httptest.NewRequest(http.MethodDelete, "/teams/"+id.String(), nil)
	req = routeTeamRequest(req, tenantID, id.String())
	rr := httptest.NewRecorder()

	handler.Delete(rr, req)

	assert.Equal(t, http.StatusNoContent, rr.Code)
}
