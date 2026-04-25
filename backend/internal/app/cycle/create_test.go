package cycle

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"

	domaincycle "github.com/getbud-co/bud2/backend/internal/domain/cycle"
	"github.com/getbud-co/bud2/backend/internal/test/fixtures"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

type stubCycleRepository struct {
	byName *domaincycle.Cycle
	create *domaincycle.Cycle
}

func (r *stubCycleRepository) Create(_ context.Context, c *domaincycle.Cycle) (*domaincycle.Cycle, error) {
	if r.create != nil {
		return r.create, nil
	}
	return c, nil
}

func (r *stubCycleRepository) GetByID(_ context.Context, id, organizationID uuid.UUID) (*domaincycle.Cycle, error) {
	return &domaincycle.Cycle{ID: id, OrganizationID: organizationID}, nil
}

func (r *stubCycleRepository) GetByName(_ context.Context, _ uuid.UUID, _ string) (*domaincycle.Cycle, error) {
	if r.byName != nil {
		return r.byName, nil
	}
	return nil, domaincycle.ErrNotFound
}

func (r *stubCycleRepository) List(_ context.Context, _ uuid.UUID, _ *domaincycle.Status, _, _ int) (domaincycle.ListResult, error) {
	return domaincycle.ListResult{}, nil
}

func (r *stubCycleRepository) Update(_ context.Context, c *domaincycle.Cycle) (*domaincycle.Cycle, error) {
	return c, nil
}

func (r *stubCycleRepository) SoftDelete(_ context.Context, _, _ uuid.UUID) error { return nil }

func TestCreateUseCase_Execute_Success(t *testing.T) {
	repo := &stubCycleRepository{}
	uc := NewCreateUseCase(repo, testutil.NewDiscardLogger())
	start := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC)

	result, err := uc.Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		Name:           "Q1 2026",
		Type:           "quarterly",
		StartDate:      start,
		EndDate:        end,
		Status:         "planning",
	})

	assert.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, result.ID)
	assert.Equal(t, "Q1 2026", result.Name)
}

func TestCreateUseCase_Execute_DuplicateName_ReturnsConflict(t *testing.T) {
	repo := &stubCycleRepository{byName: &domaincycle.Cycle{ID: uuid.New()}}
	uc := NewCreateUseCase(repo, testutil.NewDiscardLogger())

	_, err := uc.Execute(context.Background(), CreateCommand{
		OrganizationID: fixtures.NewTestTenantID(),
		Name:           "Q1 2026",
		Type:           "quarterly",
		StartDate:      time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
		EndDate:        time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC),
		Status:         "planning",
	})

	assert.ErrorIs(t, err, domaincycle.ErrNameExists)
}
