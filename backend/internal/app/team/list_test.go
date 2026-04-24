package team

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	domainteam "github.com/getbud-co/bud2/backend/internal/domain/team"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func TestListUseCase_Execute_NormalizesPaginationAndStatus(t *testing.T) {
	teamRepo := new(mocks.TeamRepository)
	uc := NewListUseCase(teamRepo, testutil.NewDiscardLogger())
	tenantID := fixtures.NewTestTenantID()
	statusText := "active"
	status := domainteam.StatusActive
	expected := domainteam.ListResult{Teams: []domainteam.Team{*fixtures.NewTeam()}, Total: 1}

	teamRepo.On("List", mock.Anything, tenantID.UUID(), &status, 1, 100).Return(expected, nil)

	result, err := uc.Execute(context.Background(), ListCommand{
		OrganizationID: tenantID,
		Status:         &statusText,
		Page:           0,
		Size:           150,
	})

	assert.NoError(t, err)
	assert.Equal(t, expected, result)
	teamRepo.AssertExpectations(t)
}

func TestListUseCase_Execute_UsesDefaultsAndPropagatesError(t *testing.T) {
	teamRepo := new(mocks.TeamRepository)
	uc := NewListUseCase(teamRepo, testutil.NewDiscardLogger())
	tenantID := fixtures.NewTestTenantID()
	expectedErr := errors.New("list failed")

	teamRepo.On("List", mock.Anything, tenantID.UUID(), (*domainteam.Status)(nil), 1, 20).Return(domainteam.ListResult{}, expectedErr)

	_, err := uc.Execute(context.Background(), ListCommand{OrganizationID: tenantID})

	assert.ErrorIs(t, err, expectedErr)
	teamRepo.AssertExpectations(t)
}
