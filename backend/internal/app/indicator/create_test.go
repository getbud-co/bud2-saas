package indicator

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domainindicator "github.com/getbud-co/bud2/backend/internal/domain/indicator"
	domainmission "github.com/getbud-co/bud2/backend/internal/domain/mission"
	domainuser "github.com/getbud-co/bud2/backend/internal/domain/user"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/mocks"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

type indicatorDeps struct {
	indicators *mocks.IndicatorRepository
	missions   *mocks.MissionRepository
	users      *mocks.UserRepository
}

func newIndicatorDeps() indicatorDeps {
	return indicatorDeps{
		indicators: new(mocks.IndicatorRepository),
		missions:   new(mocks.MissionRepository),
		users:      new(mocks.UserRepository),
	}
}

func (d indicatorDeps) allowMission() indicatorDeps {
	d.missions.On("GetByID", mock.Anything, mock.Anything, mock.Anything).
		Return(&domainmission.Mission{ID: uuid.New()}, nil)
	return d
}

func (d indicatorDeps) allowOwner() indicatorDeps {
	d.users.On("GetActiveMemberByID", mock.Anything, mock.Anything, mock.Anything).
		Return(&domainuser.User{ID: uuid.New()}, nil)
	return d
}

func (d indicatorDeps) newCreateUseCase() *CreateUseCase {
	return NewCreateUseCase(d.indicators, d.missions, d.users, testutil.NewDiscardLogger())
}

func validCmd() CreateCommand {
	return CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		MissionID:      uuid.New(),
		OwnerID:        uuid.New(),
		Title:          "Reduzir churn",
	}
}

func TestCreateUseCase_Execute_Success_AppliesDefaults(t *testing.T) {
	d := newIndicatorDeps().allowMission().allowOwner()
	d.indicators.On("Create", mock.Anything, mock.MatchedBy(func(i *domainindicator.Indicator) bool {
		return i.Status == domainindicator.StatusDraft
	})).Return(&domainindicator.Indicator{ID: uuid.New(), Title: "x", Status: domainindicator.StatusDraft}, nil)

	created, err := d.newCreateUseCase().Execute(context.Background(), validCmd())
	require.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, created.ID)
	d.indicators.AssertExpectations(t)
}

func TestCreateUseCase_Execute_MissionInDifferentOrg_ReturnsInvalidReference(t *testing.T) {
	d := newIndicatorDeps()
	d.missions.On("GetByID", mock.Anything, mock.Anything, mock.Anything).Return(nil, domainmission.ErrNotFound)

	_, err := d.newCreateUseCase().Execute(context.Background(), validCmd())
	assert.ErrorIs(t, err, domainindicator.ErrInvalidReference)
	d.indicators.AssertNotCalled(t, "Create")
}

func TestCreateUseCase_Execute_OwnerNotActiveMember_ReturnsInvalidReference(t *testing.T) {
	d := newIndicatorDeps().allowMission()
	d.users.On("GetActiveMemberByID", mock.Anything, mock.Anything, mock.Anything).Return(nil, domainuser.ErrNotFound)

	_, err := d.newCreateUseCase().Execute(context.Background(), validCmd())
	assert.ErrorIs(t, err, domainindicator.ErrInvalidReference)
	d.indicators.AssertNotCalled(t, "Create")
}

func TestCreateUseCase_Execute_EmptyTitle_ReturnsValidationError(t *testing.T) {
	d := newIndicatorDeps().allowMission().allowOwner()

	cmd := validCmd()
	cmd.Title = ""
	_, err := d.newCreateUseCase().Execute(context.Background(), cmd)
	assert.ErrorIs(t, err, domain.ErrValidation)
	d.indicators.AssertNotCalled(t, "Create")
}

func TestCreateUseCase_Execute_RepoError_PropagatesError(t *testing.T) {
	repoErr := errors.New("db down")
	d := newIndicatorDeps().allowMission().allowOwner()
	d.indicators.On("Create", mock.Anything, mock.Anything).Return(nil, repoErr)

	_, err := d.newCreateUseCase().Execute(context.Background(), validCmd())
	assert.ErrorIs(t, err, repoErr)
}
