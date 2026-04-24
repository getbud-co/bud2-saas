package permission

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	permdom "github.com/getbud-co/bud2/backend/internal/domain/permission"
)

type mockListUseCase struct{ mock.Mock }

func (m *mockListUseCase) Execute(ctx context.Context) ([]permdom.Permission, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]permdom.Permission), args.Error(1)
}

func TestHandler_List_Success(t *testing.T) {
	uc := new(mockListUseCase)
	handler := NewHandler(uc)

	uc.On("Execute", mock.Anything).Return([]permdom.Permission{
		{ID: "people.view", Group: permdom.GroupPeople, Label: "Visualizar", Description: "Ver colaboradores"},
	}, nil)

	req := httptest.NewRequest(http.MethodGet, "/permissions", nil)
	rr := httptest.NewRecorder()
	handler.List(rr, req)

	require.Equal(t, http.StatusOK, rr.Code)
	var body ListResponse
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &body))
	require.Len(t, body.Data, 1)
	assert.Equal(t, "people.view", body.Data[0].ID)
	assert.Equal(t, "people", body.Data[0].Group)
	assert.Equal(t, "Visualizar", body.Data[0].Label)
	assert.Equal(t, "Ver colaboradores", body.Data[0].Description)
}

func TestHandler_List_UseCaseError_Returns500(t *testing.T) {
	uc := new(mockListUseCase)
	handler := NewHandler(uc)

	uc.On("Execute", mock.Anything).Return(nil, errors.New("boom"))

	req := httptest.NewRequest(http.MethodGet, "/permissions", nil)
	rr := httptest.NewRecorder()
	handler.List(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Equal(t, "application/problem+json", rr.Header().Get("Content-Type"))
}
