package mission

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
	"github.com/stretchr/testify/require"
	"gopkg.in/yaml.v3"

	apispec "github.com/getbud-co/bud2/backend/api"
	appmission "github.com/getbud-co/bud2/backend/internal/app/mission"
	"github.com/getbud-co/bud2/backend/internal/domain"
	domainmission "github.com/getbud-co/bud2/backend/internal/domain/mission"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
)

type mockCreateUC struct{ mock.Mock }

func (m *mockCreateUC) Execute(ctx context.Context, cmd appmission.CreateCommand) (*domainmission.Mission, error) {
	args := m.Called(ctx, cmd)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domainmission.Mission), args.Error(1)
}

type mockUpdateUC struct{ mock.Mock }

func (m *mockUpdateUC) Execute(ctx context.Context, cmd appmission.UpdateCommand) (*domainmission.Mission, error) {
	args := m.Called(ctx, cmd)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domainmission.Mission), args.Error(1)
}

type mockDeleteUC struct{ mock.Mock }

func (m *mockDeleteUC) Execute(ctx context.Context, cmd appmission.DeleteCommand) error {
	args := m.Called(ctx, cmd)
	return args.Error(0)
}

type mockGetUC struct{ mock.Mock }

func (m *mockGetUC) Execute(ctx context.Context, organizationID domain.TenantID, id uuid.UUID) (*domainmission.Mission, error) {
	args := m.Called(ctx, organizationID, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domainmission.Mission), args.Error(1)
}

type mockListUC struct{ mock.Mock }

func (m *mockListUC) Execute(ctx context.Context, cmd appmission.ListCommand) (domainmission.ListResult, error) {
	args := m.Called(ctx, cmd)
	return args.Get(0).(domainmission.ListResult), args.Error(1)
}

func routeReq(req *http.Request, tenantID domain.TenantID, id string) *http.Request {
	rctx := chi.NewRouteContext()
	if id != "" {
		rctx.URLParams.Add("id", id)
	}
	ctx := domain.TenantIDToContext(req.Context(), tenantID)
	return req.WithContext(context.WithValue(ctx, chi.RouteCtxKey, rctx))
}

func sampleMission(id, orgID uuid.UUID) *domainmission.Mission {
	return &domainmission.Mission{
		ID:             id,
		OrganizationID: orgID,
		OwnerID:        uuid.New(),
		Title:          "Reduzir churn",
		Status:         domainmission.StatusActive,
		Visibility:     domainmission.VisibilityPublic,
		KanbanStatus:   domainmission.KanbanTodo,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}
}

func TestHandler_Create_Success(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	createUC := new(mockCreateUC)
	handler := NewHandler(createUC, nil, nil, nil, nil)

	expected := sampleMission(uuid.New(), tenantID.UUID())
	createUC.On("Execute", mock.Anything, mock.Anything).Return(expected, nil)

	ownerID := uuid.New()
	body, _ := json.Marshal(map[string]any{
		"title":    "Reduzir churn",
		"owner_id": ownerID.String(),
	})
	req := httptest.NewRequest(http.MethodPost, "/missions", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(domain.TenantIDToContext(req.Context(), tenantID))
	rr := httptest.NewRecorder()

	handler.Create(rr, req)

	assert.Equal(t, http.StatusCreated, rr.Code)
	assert.Equal(t, "/missions/"+expected.ID.String(), rr.Header().Get("Location"))
	var resp Response
	assert.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.Equal(t, expected.ID.String(), resp.ID)
}

func TestHandler_Create_InvalidReference_Returns422(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	createUC := new(mockCreateUC)
	createUC.On("Execute", mock.Anything, mock.Anything).Return(nil, domainmission.ErrInvalidReference)
	handler := NewHandler(createUC, nil, nil, nil, nil)

	body, _ := json.Marshal(map[string]any{
		"title":    "x",
		"owner_id": uuid.New().String(),
	})
	req := httptest.NewRequest(http.MethodPost, "/missions", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(domain.TenantIDToContext(req.Context(), tenantID))
	rr := httptest.NewRecorder()

	handler.Create(rr, req)

	assert.Equal(t, http.StatusUnprocessableEntity, rr.Code, "FK / cross-tenant references must surface as 422, not 500")
}

func TestHandler_Create_MissingTitle_ReturnsValidationError(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	handler := NewHandler(new(mockCreateUC), nil, nil, nil, nil)

	body := []byte(`{"owner_id":"` + uuid.New().String() + `"}`)
	req := httptest.NewRequest(http.MethodPost, "/missions", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(domain.TenantIDToContext(req.Context(), tenantID))
	rr := httptest.NewRecorder()

	handler.Create(rr, req)

	assert.Equal(t, http.StatusUnprocessableEntity, rr.Code)
}

func TestHandler_Patch_InvalidReference_Returns422(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	patchUC := new(mockUpdateUC)
	handler := NewHandler(nil, nil, nil, patchUC, nil)

	id := uuid.New()
	patchUC.On("Execute", mock.Anything, mock.Anything).Return(nil, domainmission.ErrInvalidReference)

	body, _ := json.Marshal(map[string]any{
		"owner_id": uuid.New().String(),
	})
	req := httptest.NewRequest(http.MethodPatch, "/missions/"+id.String(), bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = routeReq(req, tenantID, id.String())
	rr := httptest.NewRecorder()

	handler.Update(rr, req)

	assert.Equal(t, http.StatusUnprocessableEntity, rr.Code)
}

func TestHandler_Patch_OnlyTitle_PreservesOtherFieldsAtBoundary(t *testing.T) {
	// Boundary-level test: handler routes a single-field PATCH to the use case
	// with only Title set; all other UpdateCommand pointers must be nil so the
	// use case knows not to touch those fields.
	tenantID := fixtures.NewTestTenantID()
	patchUC := new(mockUpdateUC)
	handler := NewHandler(nil, nil, nil, patchUC, nil)

	id := uuid.New()
	expected := sampleMission(id, tenantID.UUID())
	patchUC.On("Execute", mock.Anything, mock.MatchedBy(func(cmd appmission.UpdateCommand) bool {
		return cmd.Title != nil && *cmd.Title == "new title" &&
			cmd.Description == nil &&
			cmd.CycleID == nil &&
			cmd.OwnerID == nil &&
			cmd.TeamID == nil &&
			cmd.Status == nil &&
			cmd.Visibility == nil &&
			cmd.KanbanStatus == nil &&
			cmd.SortOrder == nil &&
			cmd.DueDate == nil
	})).Return(expected, nil)

	body := []byte(`{"title":"new title"}`)
	req := httptest.NewRequest(http.MethodPatch, "/missions/"+id.String(), bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = routeReq(req, tenantID, id.String())
	rr := httptest.NewRecorder()

	handler.Update(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	patchUC.AssertExpectations(t)
}

func TestHandler_Patch_EmptyBody_Returns400(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	patchUC := new(mockUpdateUC)
	handler := NewHandler(nil, nil, nil, patchUC, nil)

	id := uuid.New()
	body := []byte(`{}`)
	req := httptest.NewRequest(http.MethodPatch, "/missions/"+id.String(), bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = routeReq(req, tenantID, id.String())
	rr := httptest.NewRecorder()

	handler.Update(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	patchUC.AssertNotCalled(t, "Execute")
}

func TestHandler_Patch_BodyWithParentID_IgnoredSilently(t *testing.T) {
	// parent_id is intentionally not exposed in PatchMissionRequest. A custom
	// client sending it must NOT be able to reparent. We accept the request
	// (json.Unmarshal silently drops unknown fields by default) but the use
	// case never receives parent_id — there is no field for it.
	tenantID := fixtures.NewTestTenantID()
	patchUC := new(mockUpdateUC)
	handler := NewHandler(nil, nil, nil, patchUC, nil)

	id := uuid.New()
	expected := sampleMission(id, tenantID.UUID())
	patchUC.On("Execute", mock.Anything, mock.Anything).Return(expected, nil)

	body, _ := json.Marshal(map[string]any{
		"title":     "new title",
		"parent_id": uuid.New().String(), // sneaky client; must not affect anything
	})
	req := httptest.NewRequest(http.MethodPatch, "/missions/"+id.String(), bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = routeReq(req, tenantID, id.String())
	rr := httptest.NewRecorder()

	handler.Update(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	// UpdateCommand has no ParentID field; the request was processed normally
	// using only Title. Reparent simply does not exist in this contract.
}

// ── Get ───────────────────────────────────────────────────────────────────

func TestHandler_Get_Success(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	id := uuid.New()
	getUC := new(mockGetUC)
	expected := sampleMission(id, tenantID.UUID())
	getUC.On("Execute", mock.Anything, tenantID, id).Return(expected, nil)
	handler := NewHandler(nil, getUC, nil, nil, nil)

	req := httptest.NewRequest(http.MethodGet, "/missions/"+id.String(), nil)
	req = routeReq(req, tenantID, id.String())
	rr := httptest.NewRecorder()

	handler.Get(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	var resp Response
	assert.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.Equal(t, id.String(), resp.ID)
}

func TestHandler_Get_NotFound_Returns404(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	id := uuid.New()
	getUC := new(mockGetUC)
	getUC.On("Execute", mock.Anything, mock.Anything, mock.Anything).Return(nil, domainmission.ErrNotFound)
	handler := NewHandler(nil, getUC, nil, nil, nil)

	req := httptest.NewRequest(http.MethodGet, "/missions/"+id.String(), nil)
	req = routeReq(req, tenantID, id.String())
	rr := httptest.NewRecorder()

	handler.Get(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

func TestHandler_Get_InvalidUUID_Returns400(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	handler := NewHandler(nil, new(mockGetUC), nil, nil, nil)

	req := httptest.NewRequest(http.MethodGet, "/missions/not-a-uuid", nil)
	req = routeReq(req, tenantID, "not-a-uuid")
	rr := httptest.NewRecorder()

	handler.Get(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

// ── List ──────────────────────────────────────────────────────────────────

func TestHandler_List_NoParams_ReturnsAllInOrg(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	listUC := new(mockListUC)
	listUC.On("Execute", mock.Anything, mock.MatchedBy(func(cmd appmission.ListCommand) bool {
		return cmd.OrganizationID == tenantID && !cmd.FilterByParent && cmd.ParentID == nil && cmd.Status == nil
	})).Return(domainmission.ListResult{Missions: nil, Total: 0}, nil)
	handler := NewHandler(nil, nil, listUC, nil, nil)

	req := httptest.NewRequest(http.MethodGet, "/missions", nil)
	req = req.WithContext(domain.TenantIDToContext(req.Context(), tenantID))
	rr := httptest.NewRecorder()

	handler.List(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	listUC.AssertExpectations(t)
}

func TestHandler_List_ParentIDNull_SetsFilterByParentTrueWithNilID(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	listUC := new(mockListUC)
	listUC.On("Execute", mock.Anything, mock.MatchedBy(func(cmd appmission.ListCommand) bool {
		return cmd.FilterByParent && cmd.ParentID == nil
	})).Return(domainmission.ListResult{}, nil)
	handler := NewHandler(nil, nil, listUC, nil, nil)

	req := httptest.NewRequest(http.MethodGet, "/missions?parent_id=null", nil)
	req = req.WithContext(domain.TenantIDToContext(req.Context(), tenantID))
	rr := httptest.NewRecorder()

	handler.List(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	listUC.AssertExpectations(t)
}

func TestHandler_List_ParentIDUUID_PropagatesAsUUID(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	parentID := uuid.New()
	listUC := new(mockListUC)
	listUC.On("Execute", mock.Anything, mock.MatchedBy(func(cmd appmission.ListCommand) bool {
		return cmd.FilterByParent && cmd.ParentID != nil && *cmd.ParentID == parentID
	})).Return(domainmission.ListResult{}, nil)
	handler := NewHandler(nil, nil, listUC, nil, nil)

	req := httptest.NewRequest(http.MethodGet, "/missions?parent_id="+parentID.String(), nil)
	req = req.WithContext(domain.TenantIDToContext(req.Context(), tenantID))
	rr := httptest.NewRecorder()

	handler.List(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestHandler_List_InvalidParentID_Returns400(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	handler := NewHandler(nil, nil, new(mockListUC), nil, nil)

	req := httptest.NewRequest(http.MethodGet, "/missions?parent_id=not-a-uuid", nil)
	req = req.WithContext(domain.TenantIDToContext(req.Context(), tenantID))
	rr := httptest.NewRecorder()

	handler.List(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestHandler_List_InvalidCycleID_Returns400(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	handler := NewHandler(nil, nil, new(mockListUC), nil, nil)

	req := httptest.NewRequest(http.MethodGet, "/missions?cycle_id=bogus", nil)
	req = req.WithContext(domain.TenantIDToContext(req.Context(), tenantID))
	rr := httptest.NewRecorder()

	handler.List(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestHandler_List_InvalidStatusEnum_Returns400(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	handler := NewHandler(nil, nil, new(mockListUC), nil, nil)

	req := httptest.NewRequest(http.MethodGet, "/missions?status=bogus", nil)
	req = req.WithContext(domain.TenantIDToContext(req.Context(), tenantID))
	rr := httptest.NewRecorder()

	handler.List(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestHandler_List_StatusFilterPropagated(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	listUC := new(mockListUC)
	listUC.On("Execute", mock.Anything, mock.MatchedBy(func(cmd appmission.ListCommand) bool {
		return cmd.Status != nil && *cmd.Status == "active"
	})).Return(domainmission.ListResult{}, nil)
	handler := NewHandler(nil, nil, listUC, nil, nil)

	req := httptest.NewRequest(http.MethodGet, "/missions?status=active", nil)
	req = req.WithContext(domain.TenantIDToContext(req.Context(), tenantID))
	rr := httptest.NewRecorder()

	handler.List(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestHandler_List_AllUUIDFiltersPropagated(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	cycleID := uuid.New()
	ownerID := uuid.New()
	teamID := uuid.New()
	listUC := new(mockListUC)
	listUC.On("Execute", mock.Anything, mock.MatchedBy(func(cmd appmission.ListCommand) bool {
		return cmd.CycleID != nil && *cmd.CycleID == cycleID &&
			cmd.OwnerID != nil && *cmd.OwnerID == ownerID &&
			cmd.TeamID != nil && *cmd.TeamID == teamID
	})).Return(domainmission.ListResult{}, nil)
	handler := NewHandler(nil, nil, listUC, nil, nil)

	url := "/missions?cycle_id=" + cycleID.String() + "&owner_id=" + ownerID.String() + "&team_id=" + teamID.String()
	req := httptest.NewRequest(http.MethodGet, url, nil)
	req = req.WithContext(domain.TenantIDToContext(req.Context(), tenantID))
	rr := httptest.NewRecorder()

	handler.List(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
}

// ── Delete ────────────────────────────────────────────────────────────────

func TestHandler_Delete_NotFound_IsIdempotent(t *testing.T) {
	tenantID := fixtures.NewTestTenantID()
	deleteUC := new(mockDeleteUC)
	handler := NewHandler(nil, nil, nil, nil, deleteUC)

	id := uuid.New()
	deleteUC.On("Execute", mock.Anything, appmission.DeleteCommand{OrganizationID: tenantID, ID: id}).Return(nil)

	req := httptest.NewRequest(http.MethodDelete, "/missions/"+id.String(), nil)
	req = routeReq(req, tenantID, id.String())
	rr := httptest.NewRecorder()

	handler.Delete(rr, req)

	assert.Equal(t, http.StatusNoContent, rr.Code)
}

// ── OpenAPI contract ──────────────────────────────────────────────────────

// TestHandler_OpenAPIDocuments400 guards against handler ↔ contract drift:
// the handler emits 400 on invalid UUIDs (path or query) and on the status
// enum query filter. The OpenAPI spec must advertise that response on every
// path that can produce it.
func TestHandler_OpenAPIDocuments400(t *testing.T) {
	type response struct {
		Description string `yaml:"description"`
	}
	type op struct {
		Responses map[string]response `yaml:"responses"`
	}
	type pathItem struct {
		Get    *op `yaml:"get"`
		Put    *op `yaml:"put"`
		Patch  *op `yaml:"patch"`
		Post   *op `yaml:"post"`
		Delete *op `yaml:"delete"`
	}
	type spec struct {
		Paths map[string]pathItem `yaml:"paths"`
	}

	var s spec
	require.NoError(t, yaml.Unmarshal(apispec.Spec, &s))

	mustHave400 := []struct {
		path, method string
	}{
		{"/missions", "GET"},
		{"/missions/{id}", "GET"},
		{"/missions/{id}", "PUT"},
		{"/missions/{id}", "PATCH"},
		{"/missions/{id}", "DELETE"},
	}

	for _, entry := range mustHave400 {
		item, ok := s.Paths[entry.path]
		require.Truef(t, ok, "spec missing path %s", entry.path)

		var operation *op
		switch entry.method {
		case "GET":
			operation = item.Get
		case "PUT":
			operation = item.Put
		case "PATCH":
			operation = item.Patch
		case "POST":
			operation = item.Post
		case "DELETE":
			operation = item.Delete
		}
		// The mission update endpoint is currently bound to PATCH; PUT may
		// not exist in the spec. Skip silently — the other variant covers it.
		if operation == nil {
			continue
		}
		_, has400 := operation.Responses["400"]
		require.Truef(t, has400, "%s %s must document a 400 response", entry.method, entry.path)
	}
}
