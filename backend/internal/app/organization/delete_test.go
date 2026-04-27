package organization

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	apptx "github.com/getbud-co/bud2/backend/internal/app/tx"
	"github.com/getbud-co/bud2/backend/internal/domain/indicator"
	"github.com/getbud-co/bud2/backend/internal/domain/mission"
	org "github.com/getbud-co/bud2/backend/internal/domain/organization"
	"github.com/getbud-co/bud2/backend/internal/domain/task"
	"github.com/getbud-co/bud2/backend/internal/domain/team"
	usr "github.com/getbud-co/bud2/backend/internal/domain/user"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

type deleteOrgTestTxRepos struct {
	orgRepo org.Repository
}

func (r deleteOrgTestTxRepos) Organizations() org.Repository       { return r.orgRepo }
func (r deleteOrgTestTxRepos) Users() usr.Repository               { return nil }
func (r deleteOrgTestTxRepos) Teams() team.Repository              { return nil }
func (r deleteOrgTestTxRepos) Missions() mission.Repository        { return nil }
func (r deleteOrgTestTxRepos) Indicators() indicator.Repository    { return nil }
func (r deleteOrgTestTxRepos) Tasks() task.Repository              { return nil }

type deleteOrgTestTxManager struct {
	repos     apptx.Repositories
	called    bool
	returnErr error
}

func (m *deleteOrgTestTxManager) WithTx(ctx context.Context, fn func(repos apptx.Repositories) error) error {
	m.called = true
	if m.returnErr != nil {
		return m.returnErr
	}
	return fn(m.repos)
}

func TestDeleteUseCase_Execute_Success(t *testing.T) {
	repo := new(mocks.OrganizationRepository)
	txm := &deleteOrgTestTxManager{repos: deleteOrgTestTxRepos{orgRepo: repo}}
	uc := NewDeleteUseCase(txm, testutil.NewDiscardLogger())

	orgID := uuid.New()
	repo.On("GetByID", mock.Anything, orgID).Return(fixtures.NewOrganization(), nil)
	repo.On("Delete", mock.Anything, orgID).Return(nil)

	err := uc.Execute(context.Background(), DeleteCommand{RequesterIsSystemAdmin: true, ID: orgID})

	assert.NoError(t, err)
	assert.True(t, txm.called)
}

func TestDeleteUseCase_Execute_RequiresSystemAdmin(t *testing.T) {
	uc := NewDeleteUseCase(&deleteOrgTestTxManager{}, testutil.NewDiscardLogger())

	err := uc.Execute(context.Background(), DeleteCommand{ID: uuid.New()})

	assert.ErrorIs(t, err, ErrDeleteRequiresSystemAdmin)
}

func TestDeleteUseCase_Execute_NotFound(t *testing.T) {
	repo := new(mocks.OrganizationRepository)
	txm := &deleteOrgTestTxManager{repos: deleteOrgTestTxRepos{orgRepo: repo}}
	uc := NewDeleteUseCase(txm, testutil.NewDiscardLogger())

	orgID := uuid.New()
	repo.On("GetByID", mock.Anything, orgID).Return(nil, org.ErrNotFound)

	err := uc.Execute(context.Background(), DeleteCommand{RequesterIsSystemAdmin: true, ID: orgID})

	assert.ErrorIs(t, err, org.ErrNotFound)
}

func TestDeleteUseCase_Execute_TransactionError(t *testing.T) {
	txm := &deleteOrgTestTxManager{returnErr: errors.New("tx error")}
	uc := NewDeleteUseCase(txm, testutil.NewDiscardLogger())

	err := uc.Execute(context.Background(), DeleteCommand{RequesterIsSystemAdmin: true, ID: uuid.New()})

	assert.Error(t, err)
	assert.True(t, txm.called)
}
