package middleware

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/getbud-co/bud2/backend/internal/domain"
	"github.com/getbud-co/bud2/backend/internal/infra/postgres/sqlc"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
)

func TestActiveOrganizationMiddleware_MissingTenantID(t *testing.T) {
	mockQuerier := new(mocks.ActiveOrganizationQuerier)
	mw := ActiveOrganizationMiddleware(mockQuerier)
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rr := httptest.NewRecorder()

	mw(handler).ServeHTTP(rr, req)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)
	assert.Contains(t, rr.Body.String(), "tenant_id is required")
}

func TestActiveOrganizationMiddleware_OrganizationNotFound(t *testing.T) {
	mockQuerier := new(mocks.ActiveOrganizationQuerier)
	mw := ActiveOrganizationMiddleware(mockQuerier)
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	tenantID := fixtures.NewTestTenantID()
	mockQuerier.On("GetOrganizationByID", mock.Anything, tenantID.UUID()).Return(sqlc.GetOrganizationByIDRow{}, pgx.ErrNoRows)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req = req.WithContext(fixtures.NewContextWithTenant(tenantID))
	rr := httptest.NewRecorder()

	mw(handler).ServeHTTP(rr, req)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)
	assert.Contains(t, rr.Body.String(), "active organization is invalid")
	mockQuerier.AssertExpectations(t)
}

func TestActiveOrganizationMiddleware_MissingClaims(t *testing.T) {
	mockQuerier := new(mocks.ActiveOrganizationQuerier)
	mw := ActiveOrganizationMiddleware(mockQuerier)
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	tenantID := fixtures.NewTestTenantID()
	mockQuerier.On("GetOrganizationByID", mock.Anything, tenantID.UUID()).Return(sqlc.GetOrganizationByIDRow{ID: tenantID.UUID()}, nil)

	ctx := fixtures.NewContextWithTenant(tenantID)
	req := httptest.NewRequest(http.MethodGet, "/", nil).WithContext(ctx)
	rr := httptest.NewRecorder()

	mw(handler).ServeHTTP(rr, req)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)
	assert.Contains(t, rr.Body.String(), "authentication required")
	mockQuerier.AssertExpectations(t)
}

func TestActiveOrganizationMiddleware_MembershipNotFound(t *testing.T) {
	mockQuerier := new(mocks.ActiveOrganizationQuerier)
	mw := ActiveOrganizationMiddleware(mockQuerier)
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	tenantID := fixtures.NewTestTenantID()
	claims := fixtures.NewTestUserClaims()

	mockQuerier.On("GetOrganizationByID", mock.Anything, tenantID.UUID()).Return(sqlc.GetOrganizationByIDRow{ID: tenantID.UUID()}, nil)
	mockQuerier.On("GetActiveOrganizationMembership", mock.Anything, sqlc.GetActiveOrganizationMembershipParams{
		OrganizationID: tenantID.UUID(),
		UserID:         claims.UserID.UUID(),
	}).Return(sqlc.GetActiveOrganizationMembershipRow{}, pgx.ErrNoRows)

	req := httptest.NewRequest(http.MethodGet, "/", nil).WithContext(fixtures.NewContextWithUserClaims(claims))
	rr := httptest.NewRecorder()

	mw(handler).ServeHTTP(rr, req)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)
	assert.Contains(t, rr.Body.String(), "active organization membership is invalid")
	mockQuerier.AssertExpectations(t)
}

func TestActiveOrganizationMiddleware_DatabaseError_GetOrganization(t *testing.T) {
	mockQuerier := new(mocks.ActiveOrganizationQuerier)
	mw := ActiveOrganizationMiddleware(mockQuerier)
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	tenantID := fixtures.NewTestTenantID()
	mockQuerier.On("GetOrganizationByID", mock.Anything, tenantID.UUID()).Return(sqlc.GetOrganizationByIDRow{}, errors.New("db error"))

	req := httptest.NewRequest(http.MethodGet, "/", nil).WithContext(fixtures.NewContextWithTenant(tenantID))
	rr := httptest.NewRecorder()

	mw(handler).ServeHTTP(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "failed to validate active organization")
	mockQuerier.AssertExpectations(t)
}

func TestActiveOrganizationMiddleware_DatabaseError_GetMembership(t *testing.T) {
	mockQuerier := new(mocks.ActiveOrganizationQuerier)
	mw := ActiveOrganizationMiddleware(mockQuerier)
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	tenantID := fixtures.NewTestTenantID()
	claims := fixtures.NewTestUserClaims()

	mockQuerier.On("GetOrganizationByID", mock.Anything, tenantID.UUID()).Return(sqlc.GetOrganizationByIDRow{ID: tenantID.UUID()}, nil)
	mockQuerier.On("GetActiveOrganizationMembership", mock.Anything, sqlc.GetActiveOrganizationMembershipParams{
		OrganizationID: tenantID.UUID(),
		UserID:         claims.UserID.UUID(),
	}).Return(sqlc.GetActiveOrganizationMembershipRow{}, errors.New("db error"))

	req := httptest.NewRequest(http.MethodGet, "/", nil).WithContext(fixtures.NewContextWithUserClaims(claims))
	rr := httptest.NewRecorder()

	mw(handler).ServeHTTP(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "failed to validate active organization membership")
	mockQuerier.AssertExpectations(t)
}

func TestActiveOrganizationMiddleware_SystemAdminBypass(t *testing.T) {
	mockQuerier := new(mocks.ActiveOrganizationQuerier)
	mw := ActiveOrganizationMiddleware(mockQuerier)
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, err := domain.ClaimsFromContext(r.Context())
		assert.NoError(t, err)
		assert.Empty(t, claims.MembershipRole)
		w.WriteHeader(http.StatusOK)
	})

	tenantID := fixtures.NewTestTenantID()
	claims := fixtures.NewTestUserClaims()
	claims.IsSystemAdmin = true
	claims.MembershipRole = ""

	mockQuerier.On("GetOrganizationByID", mock.Anything, tenantID.UUID()).Return(sqlc.GetOrganizationByIDRow{ID: tenantID.UUID()}, nil)

	req := httptest.NewRequest(http.MethodGet, "/", nil).WithContext(fixtures.NewContextWithUserClaims(claims))
	rr := httptest.NewRecorder()

	mw(handler).ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	mockQuerier.AssertExpectations(t)
}

func TestActiveOrganizationMiddleware_Success(t *testing.T) {
	mockQuerier := new(mocks.ActiveOrganizationQuerier)
	mw := ActiveOrganizationMiddleware(mockQuerier)

	tenantID := fixtures.NewTestTenantID()
	claims := fixtures.NewTestUserClaims()
	claims.MembershipRole = ""

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		updatedClaims, err := domain.ClaimsFromContext(r.Context())
		assert.NoError(t, err)
		assert.Equal(t, "admin", updatedClaims.MembershipRole)
		w.WriteHeader(http.StatusOK)
	})

	mockQuerier.On("GetOrganizationByID", mock.Anything, tenantID.UUID()).Return(sqlc.GetOrganizationByIDRow{ID: tenantID.UUID()}, nil)
	mockQuerier.On("GetActiveOrganizationMembership", mock.Anything, sqlc.GetActiveOrganizationMembershipParams{
		OrganizationID: tenantID.UUID(),
		UserID:         claims.UserID.UUID(),
	}).Return(sqlc.GetActiveOrganizationMembershipRow{Role: "admin"}, nil)

	req := httptest.NewRequest(http.MethodGet, "/", nil).WithContext(fixtures.NewContextWithUserClaims(claims))
	rr := httptest.NewRecorder()

	mw(handler).ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	mockQuerier.AssertExpectations(t)
}
