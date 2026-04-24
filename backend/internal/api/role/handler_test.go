package role

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	approle "github.com/getbud-co/bud2/backend/internal/app/role"
	"github.com/getbud-co/bud2/backend/internal/domain"
	roledom "github.com/getbud-co/bud2/backend/internal/domain/role"
)

type mockListUseCase struct{ mock.Mock }

func (m *mockListUseCase) Execute(ctx context.Context, cmd approle.ListCommand) ([]roledom.Role, error) {
	args := m.Called(ctx, cmd)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]roledom.Role), args.Error(1)
}

func TestHandler_List_RequiresTenant(t *testing.T) {
	uc := new(mockListUseCase)
	handler := NewHandler(uc)

	req := httptest.NewRequest(http.MethodGet, "/roles", nil)
	rr := httptest.NewRecorder()
	handler.List(rr, req)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)
	assert.Equal(t, "application/problem+json", rr.Header().Get("Content-Type"))
	uc.AssertNotCalled(t, "Execute", mock.Anything, mock.Anything)
}

func TestHandler_List_UseCaseError_Returns500(t *testing.T) {
	uc := new(mockListUseCase)
	handler := NewHandler(uc)
	tenantID := domain.TenantID(uuid.New())

	uc.On("Execute", mock.Anything, approle.ListCommand{OrganizationID: tenantID}).Return(nil, errors.New("boom"))

	req := httptest.NewRequest(http.MethodGet, "/roles", nil).WithContext(domain.TenantIDToContext(context.Background(), tenantID))
	rr := httptest.NewRecorder()
	handler.List(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Equal(t, "application/problem+json", rr.Header().Get("Content-Type"))
}
