package indicator

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	domainindicator "github.com/getbud-co/bud2/backend/internal/domain/indicator"
	domainuser "github.com/getbud-co/bud2/backend/internal/domain/user"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func newUpdateDeps() (*mocks.IndicatorRepository, *mocks.UserRepository) {
	return new(mocks.IndicatorRepository), new(mocks.UserRepository)
}

func TestUpdateUseCase_Execute_AppliesPartialFields(t *testing.T) {
	repo, users := newUpdateDeps()
	id := uuid.New()
	existing := &domainindicator.Indicator{
		ID:     id,
		Title:  "old",
		Status: domainindicator.StatusActive,
	}
	repo.On("GetByID", mock.Anything, id, mock.Anything).Return(existing, nil)
	newTitle := "new"
	repo.On("Update", mock.Anything, mock.MatchedBy(func(i *domainindicator.Indicator) bool {
		return i.Title == newTitle && i.Status == domainindicator.StatusActive
	})).Return(existing, nil)

	_, err := NewUpdateUseCase(repo, users, testutil.NewDiscardLogger()).Execute(context.Background(), UpdateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		ID:             id,
		Title:          &newTitle,
	})
	require.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestUpdateUseCase_Execute_OwnerChange_NotMember_ReturnsInvalidReference(t *testing.T) {
	repo, users := newUpdateDeps()
	existing := &domainindicator.Indicator{ID: uuid.New(), Title: "x", OwnerID: uuid.New(), Status: domainindicator.StatusActive}
	repo.On("GetByID", mock.Anything, mock.Anything, mock.Anything).Return(existing, nil)
	users.On("GetActiveMemberByID", mock.Anything, mock.Anything, mock.Anything).Return(nil, domainuser.ErrNotFound)

	newOwner := uuid.New()
	_, err := NewUpdateUseCase(repo, users, testutil.NewDiscardLogger()).Execute(context.Background(), UpdateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		ID:             existing.ID,
		OwnerID:        &newOwner,
	})
	assert.ErrorIs(t, err, domainindicator.ErrInvalidReference)
	repo.AssertNotCalled(t, "Update")
}

func TestUpdateUseCase_Execute_PropagatesNotFoundFromGet(t *testing.T) {
	repo, users := newUpdateDeps()
	repo.On("GetByID", mock.Anything, mock.Anything, mock.Anything).Return(nil, domainindicator.ErrNotFound)

	_, err := NewUpdateUseCase(repo, users, testutil.NewDiscardLogger()).Execute(context.Background(), UpdateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		ID:             uuid.New(),
	})
	assert.ErrorIs(t, err, domainindicator.ErrNotFound)
}
