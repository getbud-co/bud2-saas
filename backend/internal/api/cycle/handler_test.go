package cycle

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	appcycle "github.com/getbud-co/bud2/backend/internal/app/cycle"
	"github.com/getbud-co/bud2/backend/internal/domain"
	domaincycle "github.com/getbud-co/bud2/backend/internal/domain/cycle"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
)

type mockCycleCreateUseCase struct{ mock.Mock }

func (m *mockCycleCreateUseCase) Execute(ctx context.Context, cmd appcycle.CreateCommand) (*domaincycle.Cycle, error) {
	args := m.Called(ctx, cmd)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domaincycle.Cycle), args.Error(1)
}

type mockCycleDeleteUseCase struct{ mock.Mock }

func (m *mockCycleDeleteUseCase) Execute(ctx context.Context, cmd appcycle.DeleteCommand) error {
	args := m.Called(ctx, cmd)
	return args.Error(0)
}

func routeCycleRequest(req *http.Request, tenantID domain.TenantID, id string) *http.Request {
	rctx := chi.NewRouteContext()
	if id != "" {
		rctx.URLParams.Add("id", id)
	}
	ctx := domain.TenantIDToContext(req.Context(), tenantID)
	return req.WithContext(context.WithValue(ctx, chi.RouteCtxKey, rctx))
}

func TestHandler_Create_Success(t *testing.T) {
	createUC := new(mockCycleCreateUseCase)
	handler := NewHandler(createUC, nil, nil, nil, nil)
	tenantID := fixtures.NewTestTenantID()
	expected := &domaincycle.Cycle{
		ID:             uuid.New(),
		OrganizationID: tenantID.UUID(),
		Name:           "Q1 2026",
		Type:           domaincycle.TypeQuarterly,
		StartDate:      time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		EndDate:        time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC),
		Status:         domaincycle.StatusPlanning,
		CreatedAt:      time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC),
		UpdatedAt:      time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC),
	}
	createUC.On("Execute", mock.Anything, mock.Anything).Return(expected, nil)

	body := []byte(`{"name":"Q1 2026","type":"quarterly","start_date":"2026-01-01","end_date":"2026-03-31","status":"planning"}`)
	req := httptest.NewRequest(http.MethodPost, "/cycles", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(domain.TenantIDToContext(req.Context(), tenantID))
	rr := httptest.NewRecorder()

	handler.Create(rr, req)

	assert.Equal(t, http.StatusCreated, rr.Code)
	assert.Equal(t, "/cycles/"+expected.ID.String(), rr.Header().Get("Location"))
	var resp Response
	assert.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.Equal(t, expected.ID.String(), resp.ID)
	assert.Equal(t, "2026-01-01", resp.StartDate)
}

func TestHandler_Create_InvalidDate_ReturnsValidationError(t *testing.T) {
	handler := NewHandler(new(mockCycleCreateUseCase), nil, nil, nil, nil)
	tenantID := fixtures.NewTestTenantID()
	body := []byte(`{"name":"Q1 2026","type":"quarterly","start_date":"2026/01/01","end_date":"2026-03-31","status":"planning"}`)
	req := httptest.NewRequest(http.MethodPost, "/cycles", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(domain.TenantIDToContext(req.Context(), tenantID))
	rr := httptest.NewRecorder()

	handler.Create(rr, req)

	assert.Equal(t, http.StatusUnprocessableEntity, rr.Code)
}

func TestHandler_Delete_NotFound_IsIdempotent(t *testing.T) {
	deleteUC := new(mockCycleDeleteUseCase)
	handler := NewHandler(nil, nil, nil, nil, deleteUC)
	tenantID := fixtures.NewTestTenantID()
	id := uuid.New()
	deleteUC.On("Execute", mock.Anything, appcycle.DeleteCommand{OrganizationID: tenantID, ID: id}).Return(domaincycle.ErrNotFound)

	req := httptest.NewRequest(http.MethodDelete, "/cycles/"+id.String(), nil)
	req = routeCycleRequest(req, tenantID, id.String())
	rr := httptest.NewRecorder()

	handler.Delete(rr, req)

	assert.Equal(t, http.StatusNoContent, rr.Code)
}
