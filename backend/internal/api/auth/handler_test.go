package auth

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	appauth "github.com/getbud-co/bud2/backend/internal/app/auth"
	"github.com/getbud-co/bud2/backend/internal/domain"
	domainauth "github.com/getbud-co/bud2/backend/internal/domain/auth"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
)

type mockLoginUseCase struct{ mock.Mock }

func (m *mockLoginUseCase) Execute(ctx context.Context, cmd appauth.LoginCommand) (*appauth.LoginResult, error) {
	args := m.Called(ctx, cmd)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*appauth.LoginResult), args.Error(1)
}

type mockSessionUseCase struct{ mock.Mock }

func (m *mockSessionUseCase) Execute(ctx context.Context, claims domain.UserClaims) (*appauth.Session, error) {
	args := m.Called(ctx, claims)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*appauth.Session), args.Error(1)
}

type mockUpdateSessionUseCase struct{ mock.Mock }

func (m *mockUpdateSessionUseCase) Execute(ctx context.Context, claims domain.UserClaims, cmd appauth.SwitchOrganizationCommand) (*appauth.SwitchOrganizationResult, error) {
	args := m.Called(ctx, claims, cmd)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*appauth.SwitchOrganizationResult), args.Error(1)
}

type mockRefreshUseCase struct{ mock.Mock }

func (m *mockRefreshUseCase) Execute(ctx context.Context, cmd appauth.RefreshCommand) (*appauth.RefreshResult, error) {
	args := m.Called(ctx, cmd)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*appauth.RefreshResult), args.Error(1)
}

func TestHandler_Login_Success(t *testing.T) {
	loginUC := new(mockLoginUseCase)
	handler := NewHandler(loginUC, new(mockSessionUseCase), new(mockUpdateSessionUseCase), new(mockRefreshUseCase))

	testUser := fixtures.NewUser()
	testOrg := fixtures.NewOrganization()
	loginUC.On("Execute", mock.Anything, appauth.LoginCommand{Email: "admin@example.com", Password: "password123"}).Return(&appauth.LoginResult{
		Token:   "test-jwt-token",
		Session: appauth.Session{User: *testUser, ActiveOrganization: &appauth.AccessibleOrganization{ID: testOrg.ID, Name: testOrg.Name, Domain: testOrg.Domain, Workspace: testOrg.Workspace, Status: testOrg.Status}, Organizations: []appauth.AccessibleOrganization{{ID: testOrg.ID, Name: testOrg.Name, Domain: testOrg.Domain, Workspace: testOrg.Workspace, Status: testOrg.Status}}},
	}, nil)

	body, _ := json.Marshal(loginRequest{Email: "admin@example.com", Password: "password123"})
	req := httptest.NewRequest(http.MethodPost, "/auth/login", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handler.Login(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	var response authResponse
	assert.NoError(t, json.Unmarshal(rr.Body.Bytes(), &response))
	assert.Equal(t, "test-jwt-token", response.AccessToken)
	assert.Equal(t, testUser.ID.String(), response.User.ID)
	assert.Equal(t, testOrg.ID.String(), response.ActiveOrganization.ID)
}

func TestHandler_Session_Success(t *testing.T) {
	claims := fixtures.NewTestUserClaims()
	sessionUC := new(mockSessionUseCase)
	handler := NewHandler(new(mockLoginUseCase), sessionUC, new(mockUpdateSessionUseCase), new(mockRefreshUseCase))
	testUser := fixtures.NewUser()
	sessionUC.On("Execute", mock.Anything, claims).Return(&appauth.Session{User: *testUser}, nil)

	req := httptest.NewRequest(http.MethodGet, "/auth/session", nil).WithContext(fixtures.NewContextWithUserClaims(claims))
	rr := httptest.NewRecorder()
	handler.Session(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestHandler_UpdateSession_Success(t *testing.T) {
	claims := fixtures.NewTestUserClaims()
	updateUC := new(mockUpdateSessionUseCase)
	handler := NewHandler(new(mockLoginUseCase), new(mockSessionUseCase), updateUC, new(mockRefreshUseCase))
	orgID := uuid.New()
	testUser := fixtures.NewUser()
	updateUC.On("Execute", mock.Anything, claims, appauth.SwitchOrganizationCommand{OrganizationID: orgID}).Return(&appauth.SwitchOrganizationResult{Token: "new-token", Session: appauth.Session{User: *testUser}}, nil)

	body, _ := json.Marshal(updateSessionRequest{OrganizationID: orgID.String()})
	req := httptest.NewRequest(http.MethodPut, "/auth/session", bytes.NewReader(body)).WithContext(fixtures.NewContextWithUserClaims(claims))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	handler.UpdateSession(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestHandler_Login_InvalidCredentials(t *testing.T) {
	loginUC := new(mockLoginUseCase)
	handler := NewHandler(loginUC, new(mockSessionUseCase), new(mockUpdateSessionUseCase), new(mockRefreshUseCase))
	body, _ := json.Marshal(loginRequest{Email: "admin@example.com", Password: "wrongpassword"})
	loginUC.On("Execute", mock.Anything, mock.Anything).Return(nil, appauth.ErrInvalidCredentials)
	req := httptest.NewRequest(http.MethodPost, "/auth/login", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	handler.Login(rr, req)
	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}

func TestHandler_Login_InternalError(t *testing.T) {
	loginUC := new(mockLoginUseCase)
	handler := NewHandler(loginUC, new(mockSessionUseCase), new(mockUpdateSessionUseCase), new(mockRefreshUseCase))
	body, _ := json.Marshal(loginRequest{Email: "admin@example.com", Password: "password123"})
	loginUC.On("Execute", mock.Anything, mock.Anything).Return(nil, errors.New("internal error"))
	req := httptest.NewRequest(http.MethodPost, "/auth/login", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	handler.Login(rr, req)
	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

func TestHandler_Refresh_Success(t *testing.T) {
	refreshUC := new(mockRefreshUseCase)
	handler := NewHandler(new(mockLoginUseCase), new(mockSessionUseCase), new(mockUpdateSessionUseCase), refreshUC)

	testUser := fixtures.NewUser()
	refreshUC.On("Execute", mock.Anything, appauth.RefreshCommand{RawToken: "raw-refresh-token"}).Return(&appauth.RefreshResult{
		Token:        "new-access-token",
		RefreshToken: "new-refresh-token",
		Session:      appauth.Session{User: *testUser},
	}, nil)

	body, _ := json.Marshal(refreshRequest{RefreshToken: "raw-refresh-token"})
	req := httptest.NewRequest(http.MethodPost, "/auth/refresh", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handler.Refresh(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	var response authResponse
	assert.NoError(t, json.Unmarshal(rr.Body.Bytes(), &response))
	assert.Equal(t, "new-access-token", response.AccessToken)
	assert.Equal(t, "new-refresh-token", response.RefreshToken)
}

func TestHandler_Refresh_InvalidToken(t *testing.T) {
	refreshUC := new(mockRefreshUseCase)
	handler := NewHandler(new(mockLoginUseCase), new(mockSessionUseCase), new(mockUpdateSessionUseCase), refreshUC)

	refreshUC.On("Execute", mock.Anything, mock.Anything).Return(nil, domainauth.ErrRefreshTokenNotFound)

	body, _ := json.Marshal(refreshRequest{RefreshToken: "bad-token"})
	req := httptest.NewRequest(http.MethodPost, "/auth/refresh", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handler.Refresh(rr, req)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}
