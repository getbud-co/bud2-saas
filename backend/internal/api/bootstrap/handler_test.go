package bootstrap

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	appbootstrap "github.com/getbud-co/bud2/backend/internal/app/bootstrap"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
)

type mockBootstrapUseCase struct{ mock.Mock }

func (m *mockBootstrapUseCase) Execute(ctx context.Context, cmd appbootstrap.Command) (*appbootstrap.Result, error) {
	args := m.Called(ctx, cmd)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*appbootstrap.Result), args.Error(1)
}

func TestHandler_Create_Success(t *testing.T) {
	uc := new(mockBootstrapUseCase)
	handler := NewHandler(uc)

	testOrg := fixtures.NewOrganization()
	testUser := fixtures.NewUser()
	uc.On("Execute", mock.Anything, appbootstrap.Command{
		OrganizationName:      "Test Org",
		OrganizationDomain:    "example.com",
		OrganizationWorkspace: "example",
		AdminFirstName:        "Admin",
		AdminLastName:         "User",
		AdminEmail:            "admin@example.com",
		AdminPassword:         "password123",
	}).Return(&appbootstrap.Result{
		Organization: *testOrg,
		Admin:        *testUser,
		AccessToken:  "test-token",
	}, nil)

	body, _ := json.Marshal(createRequest{
		OrganizationName:      "Test Org",
		OrganizationDomain:    "example.com",
		OrganizationWorkspace: "example",
		AdminFirstName:        "Admin",
		AdminLastName:         "User",
		AdminEmail:            "admin@example.com",
		AdminPassword:         "password123",
	})
	req := httptest.NewRequest(http.MethodPost, "/bootstrap", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handler.Create(rr, req)

	assert.Equal(t, http.StatusCreated, rr.Code)
	var resp Response
	assert.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.Equal(t, "test-token", resp.AccessToken)
	assert.Equal(t, "Bearer", resp.TokenType)
	assert.Equal(t, testOrg.ID.String(), resp.Organization.ID)
	assert.Equal(t, testUser.ID.String(), resp.Admin.ID)
}

func TestHandler_Create_InvalidJSON(t *testing.T) {
	handler := NewHandler(new(mockBootstrapUseCase))

	req := httptest.NewRequest(http.MethodPost, "/bootstrap", bytes.NewReader([]byte("invalid")))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handler.Create(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestHandler_Create_AlreadyBootstrapped(t *testing.T) {
	uc := new(mockBootstrapUseCase)
	handler := NewHandler(uc)

	uc.On("Execute", mock.Anything, mock.Anything).Return(nil, appbootstrap.ErrAlreadyBootstrapped)

	body, _ := json.Marshal(createRequest{
		OrganizationName:      "Test Org",
		OrganizationDomain:    "example.com",
		OrganizationWorkspace: "example",
		AdminFirstName:        "Admin",
		AdminLastName:         "User",
		AdminEmail:            "admin@example.com",
		AdminPassword:         "password123",
	})
	req := httptest.NewRequest(http.MethodPost, "/bootstrap", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handler.Create(rr, req)

	assert.Equal(t, http.StatusConflict, rr.Code)
}

func TestHandler_Create_InternalError(t *testing.T) {
	uc := new(mockBootstrapUseCase)
	handler := NewHandler(uc)

	uc.On("Execute", mock.Anything, mock.Anything).Return(nil, errors.New("internal error"))

	body, _ := json.Marshal(createRequest{
		OrganizationName:      "Test Org",
		OrganizationDomain:    "example.com",
		OrganizationWorkspace: "example",
		AdminFirstName:        "Admin",
		AdminLastName:         "User",
		AdminEmail:            "admin@example.com",
		AdminPassword:         "password123",
	})
	req := httptest.NewRequest(http.MethodPost, "/bootstrap", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handler.Create(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

func TestHandler_Create_RequestValidationError(t *testing.T) {
	handler := NewHandler(new(mockBootstrapUseCase))

	body, _ := json.Marshal(createRequest{
		OrganizationName:      "T",
		OrganizationDomain:    "not a domain",
		OrganizationWorkspace: "",
		AdminFirstName:        "",
		AdminLastName:         "",
		AdminEmail:            "",
		AdminPassword:         "",
	})
	req := httptest.NewRequest(http.MethodPost, "/bootstrap", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handler.Create(rr, req)

	assert.Equal(t, http.StatusUnprocessableEntity, rr.Code)
}
