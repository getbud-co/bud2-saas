package tag

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

	apptag "github.com/getbud-co/bud2/backend/internal/app/tag"
	"github.com/getbud-co/bud2/backend/internal/domain"
	domaintag "github.com/getbud-co/bud2/backend/internal/domain/tag"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
)

type mockTagCreateUseCase struct{ mock.Mock }

func (m *mockTagCreateUseCase) Execute(ctx context.Context, cmd apptag.CreateCommand) (*domaintag.Tag, error) {
	args := m.Called(ctx, cmd)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domaintag.Tag), args.Error(1)
}

type mockTagDeleteUseCase struct{ mock.Mock }

func (m *mockTagDeleteUseCase) Execute(ctx context.Context, cmd apptag.DeleteCommand) error {
	args := m.Called(ctx, cmd)
	return args.Error(0)
}

func routeTagRequest(req *http.Request, tenantID domain.TenantID, id string) *http.Request {
	rctx := chi.NewRouteContext()
	if id != "" {
		rctx.URLParams.Add("id", id)
	}
	ctx := domain.TenantIDToContext(req.Context(), tenantID)
	return req.WithContext(context.WithValue(ctx, chi.RouteCtxKey, rctx))
}

func TestHandler_Create_Success(t *testing.T) {
	createUC := new(mockTagCreateUseCase)
	handler := NewHandler(createUC, nil, nil, nil, nil)
	tenantID := fixtures.NewTestTenantID()
	expected := &domaintag.Tag{
		ID:             uuid.New(),
		OrganizationID: tenantID.UUID(),
		Name:           "Engineering",
		Color:          domaintag.ColorOrange,
		CreatedAt:      time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC),
		UpdatedAt:      time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC),
	}
	createUC.On("Execute", mock.Anything, mock.Anything).Return(expected, nil)

	body := []byte(`{"name":"Engineering","color":"orange"}`)
	req := httptest.NewRequest(http.MethodPost, "/tags", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(domain.TenantIDToContext(req.Context(), tenantID))
	rr := httptest.NewRecorder()

	handler.Create(rr, req)

	assert.Equal(t, http.StatusCreated, rr.Code)
	assert.Equal(t, "/tags/"+expected.ID.String(), rr.Header().Get("Location"))
	var resp Response
	assert.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.Equal(t, expected.ID.String(), resp.ID)
	assert.Equal(t, "orange", resp.Color)
}

func TestHandler_Create_InvalidColor_ReturnsValidationError(t *testing.T) {
	handler := NewHandler(new(mockTagCreateUseCase), nil, nil, nil, nil)
	tenantID := fixtures.NewTestTenantID()
	body := []byte(`{"name":"Engineering","color":"purple"}`)
	req := httptest.NewRequest(http.MethodPost, "/tags", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(domain.TenantIDToContext(req.Context(), tenantID))
	rr := httptest.NewRecorder()

	handler.Create(rr, req)

	assert.Equal(t, http.StatusUnprocessableEntity, rr.Code)
}

func TestHandler_Delete_NotFound_IsIdempotent(t *testing.T) {
	deleteUC := new(mockTagDeleteUseCase)
	handler := NewHandler(nil, nil, nil, nil, deleteUC)
	tenantID := fixtures.NewTestTenantID()
	id := uuid.New()
	deleteUC.On("Execute", mock.Anything, apptag.DeleteCommand{OrganizationID: tenantID, ID: id}).Return(domaintag.ErrNotFound)

	req := httptest.NewRequest(http.MethodDelete, "/tags/"+id.String(), nil)
	req = routeTagRequest(req, tenantID, id.String())
	rr := httptest.NewRecorder()

	handler.Delete(rr, req)

	assert.Equal(t, http.StatusNoContent, rr.Code)
}
