package indicator

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

	appindicator "github.com/getbud-co/bud2/backend/internal/app/indicator"
	"github.com/getbud-co/bud2/backend/internal/domain"
	domainindicator "github.com/getbud-co/bud2/backend/internal/domain/indicator"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
)

type mockCreateUC struct{ mock.Mock }

func (m *mockCreateUC) Execute(ctx context.Context, cmd appindicator.CreateCommand) (*domainindicator.Indicator, error) {
	args := m.Called(ctx, cmd)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domainindicator.Indicator), args.Error(1)
}

type mockGetUC struct{ mock.Mock }

func (m *mockGetUC) Execute(ctx context.Context, organizationID domain.TenantID, id uuid.UUID) (*domainindicator.Indicator, error) {
	args := m.Called(ctx, organizationID, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domainindicator.Indicator), args.Error(1)
}

type mockListUC struct{ mock.Mock }

func (m *mockListUC) Execute(ctx context.Context, cmd appindicator.ListCommand) (domainindicator.ListResult, error) {
	args := m.Called(ctx, cmd)
	return args.Get(0).(domainindicator.ListResult), args.Error(1)
}

type mockUpdateUC struct{ mock.Mock }

func (m *mockUpdateUC) Execute(ctx context.Context, cmd appindicator.UpdateCommand) (*domainindicator.Indicator, error) {
	args := m.Called(ctx, cmd)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domainindicator.Indicator), args.Error(1)
}

type mockDeleteUC struct{ mock.Mock }

func (m *mockDeleteUC) Execute(ctx context.Context, cmd appindicator.DeleteCommand) error {
	args := m.Called(ctx, cmd)
	return args.Error(0)
}

func sample(id uuid.UUID) *domainindicator.Indicator {
	return &domainindicator.Indicator{
		ID:        id,
		Title:     "Churn rate",
		Status:    domainindicator.StatusActive,
		MissionID: uuid.New(),
		OwnerID:   uuid.New(),
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
}

func withRoute(req *http.Request, tenantID domain.TenantID, id string) *http.Request {
	rctx := chi.NewRouteContext()
	if id != "" {
		rctx.URLParams.Add("id", id)
	}
	ctx := domain.TenantIDToContext(req.Context(), tenantID)
	return req.WithContext(context.WithValue(ctx, chi.RouteCtxKey, rctx))
}

func TestHandler_Create_Success(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	uc := new(mockCreateUC)
	expected := sample(uuid.New())
	uc.On("Execute", mock.Anything, mock.Anything).Return(expected, nil)
	h := NewHandler(uc, nil, nil, nil, nil)

	body, _ := json.Marshal(map[string]any{
		"mission_id": uuid.New().String(),
		"owner_id":   uuid.New().String(),
		"title":      "Churn rate",
	})
	req := httptest.NewRequest(http.MethodPost, "/indicators", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(domain.TenantIDToContext(req.Context(), tenantID))
	rr := httptest.NewRecorder()

	h.Create(rr, req)

	assert.Equal(t, http.StatusCreated, rr.Code)
	assert.Equal(t, "/indicators/"+expected.ID.String(), rr.Header().Get("Location"))
}

func TestHandler_Create_MissingTitle_Returns422(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	h := NewHandler(new(mockCreateUC), nil, nil, nil, nil)

	body, _ := json.Marshal(map[string]any{
		"mission_id": uuid.New().String(),
		"owner_id":   uuid.New().String(),
	})
	req := httptest.NewRequest(http.MethodPost, "/indicators", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(domain.TenantIDToContext(req.Context(), tenantID))
	rr := httptest.NewRecorder()

	h.Create(rr, req)
	assert.Equal(t, http.StatusUnprocessableEntity, rr.Code)
}

func TestHandler_Create_InvalidReference_Returns422(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	uc := new(mockCreateUC)
	uc.On("Execute", mock.Anything, mock.Anything).Return(nil, domainindicator.ErrInvalidReference)
	h := NewHandler(uc, nil, nil, nil, nil)

	body, _ := json.Marshal(map[string]any{
		"mission_id": uuid.New().String(),
		"owner_id":   uuid.New().String(),
		"title":      "x",
	})
	req := httptest.NewRequest(http.MethodPost, "/indicators", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(domain.TenantIDToContext(req.Context(), tenantID))
	rr := httptest.NewRecorder()

	h.Create(rr, req)
	assert.Equal(t, http.StatusUnprocessableEntity, rr.Code)
}

func TestHandler_Get_NotFound_Returns404(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	uc := new(mockGetUC)
	id := uuid.New()
	uc.On("Execute", mock.Anything, mock.Anything, id).Return(nil, domainindicator.ErrNotFound)
	h := NewHandler(nil, uc, nil, nil, nil)

	req := httptest.NewRequest(http.MethodGet, "/indicators/"+id.String(), nil)
	req = withRoute(req, tenantID, id.String())
	rr := httptest.NewRecorder()

	h.Get(rr, req)
	assert.Equal(t, http.StatusNotFound, rr.Code)
}

func TestHandler_Patch_EmptyBody_Returns400(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	h := NewHandler(nil, nil, nil, new(mockUpdateUC), nil)

	id := uuid.New()
	body := []byte(`{}`)
	req := httptest.NewRequest(http.MethodPatch, "/indicators/"+id.String(), bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = withRoute(req, tenantID, id.String())
	rr := httptest.NewRecorder()

	h.Update(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestHandler_Delete_Returns204(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	uc := new(mockDeleteUC)
	uc.On("Execute", mock.Anything, mock.Anything).Return(nil)
	h := NewHandler(nil, nil, nil, nil, uc)

	id := uuid.New()
	req := httptest.NewRequest(http.MethodDelete, "/indicators/"+id.String(), nil)
	req = withRoute(req, tenantID, id.String())
	rr := httptest.NewRecorder()

	h.Delete(rr, req)
	assert.Equal(t, http.StatusNoContent, rr.Code)
}

func TestHandler_Get_Success_Returns200(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	uc := new(mockGetUC)
	id := uuid.New()
	uc.On("Execute", mock.Anything, mock.Anything, id).Return(sample(id), nil)
	h := NewHandler(nil, uc, nil, nil, nil)

	req := httptest.NewRequest(http.MethodGet, "/indicators/"+id.String(), nil)
	req = withRoute(req, tenantID, id.String())
	rr := httptest.NewRecorder()

	h.Get(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
	var resp Response
	assert.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.Equal(t, id.String(), resp.ID)
}

func TestHandler_List_PropagatesQueryFilters(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	uc := new(mockListUC)
	missionID := uuid.New()
	ownerID := uuid.New()
	uc.On("Execute", mock.Anything, mock.MatchedBy(func(cmd appindicator.ListCommand) bool {
		return cmd.MissionID != nil && *cmd.MissionID == missionID &&
			cmd.OwnerID != nil && *cmd.OwnerID == ownerID &&
			cmd.Status != nil && *cmd.Status == "active"
	})).Return(domainindicator.ListResult{}, nil)
	h := NewHandler(nil, nil, uc, nil, nil)

	url := "/indicators?mission_id=" + missionID.String() + "&owner_id=" + ownerID.String() + "&status=active"
	req := httptest.NewRequest(http.MethodGet, url, nil)
	req = req.WithContext(domain.TenantIDToContext(req.Context(), tenantID))
	rr := httptest.NewRecorder()

	h.List(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestHandler_List_RejectsInvalidStatusFilter(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	h := NewHandler(nil, nil, new(mockListUC), nil, nil)

	req := httptest.NewRequest(http.MethodGet, "/indicators?status=bogus", nil)
	req = req.WithContext(domain.TenantIDToContext(req.Context(), tenantID))
	rr := httptest.NewRecorder()

	h.List(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestHandler_Delete_Idempotent_Returns204_OnRepeatedCall(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	uc := new(mockDeleteUC)
	// Two delete calls in a row both succeed; the use case maps not-found to no-op.
	uc.On("Execute", mock.Anything, mock.Anything).Return(nil).Times(2)
	h := NewHandler(nil, nil, nil, nil, uc)

	id := uuid.New()
	for range 2 {
		req := httptest.NewRequest(http.MethodDelete, "/indicators/"+id.String(), nil)
		req = withRoute(req, tenantID, id.String())
		rr := httptest.NewRecorder()
		h.Delete(rr, req)
		assert.Equal(t, http.StatusNoContent, rr.Code)
	}
}
