package checkin_test

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	appcheckin "github.com/getbud-co/bud2/backend/internal/app/checkin"
	domaincheckin "github.com/getbud-co/bud2/backend/internal/domain/checkin"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func TestDeleteUseCase_Execute_Success(t *testing.T) {
	id := uuid.New()
	tenantID := fixtures.NewTestTenantID()
	repo := &mocks.CheckInRepository{}
	repo.On("SoftDelete", mock.Anything, id, tenantID.UUID()).Return(nil)

	uc := appcheckin.NewDeleteUseCase(repo, testutil.NewDiscardLogger())
	err := uc.Execute(context.Background(), appcheckin.DeleteCommand{OrgID: tenantID, ID: id})

	require.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestDeleteUseCase_Execute_NotFound_IsIdempotent(t *testing.T) {
	repo := &mocks.CheckInRepository{}
	repo.On("SoftDelete", mock.Anything, mock.Anything, mock.Anything).Return(domaincheckin.ErrNotFound)

	uc := appcheckin.NewDeleteUseCase(repo, testutil.NewDiscardLogger())
	err := uc.Execute(context.Background(), appcheckin.DeleteCommand{
		OrgID: fixtures.NewTestTenantID(),
		ID:    uuid.New(),
	})

	assert.NoError(t, err, "ErrNotFound must be silenced — DELETE is idempotent")
}

func TestDeleteUseCase_Execute_UnexpectedError_Propagated(t *testing.T) {
	repoErr := errors.New("db gone")
	repo := &mocks.CheckInRepository{}
	repo.On("SoftDelete", mock.Anything, mock.Anything, mock.Anything).Return(repoErr)

	uc := appcheckin.NewDeleteUseCase(repo, testutil.NewDiscardLogger())
	err := uc.Execute(context.Background(), appcheckin.DeleteCommand{
		OrgID: fixtures.NewTestTenantID(),
		ID:    uuid.New(),
	})

	assert.ErrorIs(t, err, repoErr)
}
