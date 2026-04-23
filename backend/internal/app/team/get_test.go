package team

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domainteam "github.com/getbud-co/bud2/backend/internal/domain/team"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func TestGetUseCase_Execute_Success(t *testing.T) {
	teamRepo := new(mocks.TeamRepository)
	uc := NewGetUseCase(teamRepo, testutil.NewDiscardLogger())

	tenantID := fixtures.NewTestTenantID()
	expected := fixtures.NewTeam()
	teamRepo.On("GetByID", mock.Anything, expected.ID, tenantID.UUID()).Return(expected, nil)

	result, err := uc.Execute(context.Background(), domain.TenantID(tenantID), expected.ID)

	assert.NoError(t, err)
	assert.Equal(t, expected, result)
	teamRepo.AssertExpectations(t)
}

func TestGetUseCase_Execute_NotFound(t *testing.T) {
	teamRepo := new(mocks.TeamRepository)
	uc := NewGetUseCase(teamRepo, testutil.NewDiscardLogger())

	tenantID := fixtures.NewTestTenantID()
	id := uuid.New()
	teamRepo.On("GetByID", mock.Anything, id, tenantID.UUID()).Return(nil, domainteam.ErrNotFound)

	_, err := uc.Execute(context.Background(), domain.TenantID(tenantID), id)

	assert.ErrorIs(t, err, domainteam.ErrNotFound)
}
