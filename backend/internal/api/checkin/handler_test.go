package checkin

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

	appcheckin "github.com/getbud-co/bud2/backend/internal/app/checkin"
	"github.com/getbud-co/bud2/backend/internal/domain"
	domaincheckin "github.com/getbud-co/bud2/backend/internal/domain/checkin"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
)

type mockCheckinCreateUC struct{ mock.Mock }

func (m *mockCheckinCreateUC) Execute(ctx context.Context, cmd appcheckin.CreateCommand) (*domaincheckin.CheckIn, error) {
	args := m.Called(ctx, cmd)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domaincheckin.CheckIn), args.Error(1)
}

type mockCheckinGetUC struct{ mock.Mock }

func (m *mockCheckinGetUC) Execute(ctx context.Context, orgID domain.TenantID, id uuid.UUID) (*domaincheckin.CheckIn, error) {
	args := m.Called(ctx, orgID, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domaincheckin.CheckIn), args.Error(1)
}

type mockCheckinListUC struct{ mock.Mock }

func (m *mockCheckinListUC) Execute(ctx context.Context, cmd appcheckin.ListCommand) (domaincheckin.ListResult, error) {
	args := m.Called(ctx, cmd)
	return args.Get(0).(domaincheckin.ListResult), args.Error(1)
}

type mockCheckinUpdateUC struct{ mock.Mock }

func (m *mockCheckinUpdateUC) Execute(ctx context.Context, cmd appcheckin.UpdateCommand) (*domaincheckin.CheckIn, error) {
	args := m.Called(ctx, cmd)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domaincheckin.CheckIn), args.Error(1)
}

type mockCheckinDeleteUC struct{ mock.Mock }

func (m *mockCheckinDeleteUC) Execute(ctx context.Context, cmd appcheckin.DeleteCommand) error {
	args := m.Called(ctx, cmd)
	return args.Error(0)
}

func routeCheckinRequest(req *http.Request, tenantID domain.TenantID, id string) *http.Request {
	rctx := chi.NewRouteContext()
	if id != "" {
		rctx.URLParams.Add("id", id)
	}
	ctx := domain.TenantIDToContext(req.Context(), tenantID)
	return req.WithContext(context.WithValue(ctx, chi.RouteCtxKey, rctx))
}

func TestCheckinHandler_Create_Success(t *testing.T) {
	createUC := new(mockCheckinCreateUC)
	handler := NewHandler(createUC, nil, nil, nil, nil)
	tenantID := fixtures.NewTestTenantID()
	indicatorID := uuid.New()
	authorID := uuid.New()
	expected := &domaincheckin.CheckIn{
		ID:          uuid.New(),
		OrgID:       tenantID.UUID(),
		IndicatorID: indicatorID,
		AuthorID:    authorID,
		Value:       "75",
		Confidence:  domaincheckin.ConfidenceHigh,
		Mentions:    []string{},
	}
	createUC.On("Execute", mock.Anything, mock.Anything).Return(expected, nil)

	bodyBytes, _ := json.Marshal(map[string]any{
		"indicator_id": indicatorID.String(),
		"author_id":    authorID.String(),
		"value":        "75",
		"confidence":   "high",
	})
	req := httptest.NewRequest(http.MethodPost, "/checkins", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(domain.TenantIDToContext(req.Context(), tenantID))
	rr := httptest.NewRecorder()

	handler.Create(rr, req)

	assert.Equal(t, http.StatusCreated, rr.Code)
	assert.Equal(t, "/checkins/"+expected.ID.String(), rr.Header().Get("Location"))
	var resp Response
	assert.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.Equal(t, expected.ID.String(), resp.ID)
}

func TestCheckinHandler_List_MissingIndicatorID_Returns400(t *testing.T) {
	handler := NewHandler(nil, nil, new(mockCheckinListUC), nil, nil)
	tenantID := fixtures.NewTestTenantID()
	req := httptest.NewRequest(http.MethodGet, "/checkins", nil)
	req = req.WithContext(domain.TenantIDToContext(req.Context(), tenantID))
	rr := httptest.NewRecorder()

	handler.List(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestCheckinHandler_List_WithIndicatorID_Returns200(t *testing.T) {
	listUC := new(mockCheckinListUC)
	handler := NewHandler(nil, nil, listUC, nil, nil)
	tenantID := fixtures.NewTestTenantID()
	indicatorID := uuid.New()
	listUC.On("Execute", mock.Anything, mock.Anything).Return(domaincheckin.ListResult{Total: 0, Page: 1, Size: 50}, nil)

	req := httptest.NewRequest(http.MethodGet, "/checkins?indicator_id="+indicatorID.String(), nil)
	req = req.WithContext(domain.TenantIDToContext(req.Context(), tenantID))
	rr := httptest.NewRecorder()

	handler.List(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestCheckinHandler_Get_Success(t *testing.T) {
	getUC := new(mockCheckinGetUC)
	handler := NewHandler(nil, getUC, nil, nil, nil)
	tenantID := fixtures.NewTestTenantID()
	id := uuid.New()
	expected := &domaincheckin.CheckIn{ID: id, Value: "80", Confidence: domaincheckin.ConfidenceMedium, Mentions: []string{}}
	getUC.On("Execute", mock.Anything, tenantID, id).Return(expected, nil)

	req := httptest.NewRequest(http.MethodGet, "/checkins/"+id.String(), nil)
	req = routeCheckinRequest(req, tenantID, id.String())
	rr := httptest.NewRecorder()

	handler.Get(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	var resp Response
	assert.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.Equal(t, id.String(), resp.ID)
}

func TestCheckinHandler_Update_Success(t *testing.T) {
	updateUC := new(mockCheckinUpdateUC)
	handler := NewHandler(nil, nil, nil, updateUC, nil)
	tenantID := fixtures.NewTestTenantID()
	id := uuid.New()
	expected := &domaincheckin.CheckIn{ID: id, Value: "90", Confidence: domaincheckin.ConfidenceHigh, Mentions: []string{}}
	updateUC.On("Execute", mock.Anything, mock.Anything).Return(expected, nil)

	bodyBytes, _ := json.Marshal(map[string]any{"value": "90", "confidence": "high"})
	req := httptest.NewRequest(http.MethodPatch, "/checkins/"+id.String(), bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	req = routeCheckinRequest(req, tenantID, id.String())
	rr := httptest.NewRecorder()

	handler.Update(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestCheckinHandler_Delete_NotFound_IsIdempotent(t *testing.T) {
	deleteUC := new(mockCheckinDeleteUC)
	handler := NewHandler(nil, nil, nil, nil, deleteUC)
	tenantID := fixtures.NewTestTenantID()
	id := uuid.New()
	deleteUC.On("Execute", mock.Anything, appcheckin.DeleteCommand{OrgID: tenantID, ID: id}).Return(nil)

	req := httptest.NewRequest(http.MethodDelete, "/checkins/"+id.String(), nil)
	req = routeCheckinRequest(req, tenantID, id.String())
	rr := httptest.NewRecorder()

	handler.Delete(rr, req)

	assert.Equal(t, http.StatusNoContent, rr.Code)
}
