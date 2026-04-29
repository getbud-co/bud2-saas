//go:build integration

package postgres

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	domaincheckin "github.com/getbud-co/bud2/backend/internal/domain/checkin"
	"github.com/getbud-co/bud2/backend/internal/domain/indicator"
	"github.com/getbud-co/bud2/backend/internal/domain/organization"
	domainuser "github.com/getbud-co/bud2/backend/internal/domain/user"
	"github.com/getbud-co/bud2/backend/internal/infra/postgres/sqlc"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func TestCheckInRepository_CRUD_IsTenantScopedAndSoftDeletes(t *testing.T) {
	env := testutil.NewPostgresIntegrationEnv(t)
	ctx := context.Background()
	queries := sqlc.New(env.Pool)
	orgRepo := NewOrgRepository(queries)
	userRepo := NewUserRepository(queries)
	indRepo := NewIndicatorRepository(queries)
	checkInRepo := NewCheckInRepository(queries)

	// Create two orgs for tenant isolation check.
	orgA, err := orgRepo.Create(ctx, &organization.Organization{
		Name:      "CheckIn A",
		Domain:    "checkin-a.example.com",
		Workspace: "checkin-a",
		Status:    organization.StatusActive,
	})
	require.NoError(t, err)
	orgB, err := orgRepo.Create(ctx, &organization.Organization{
		Name:      "CheckIn B",
		Domain:    "checkin-b.example.com",
		Workspace: "checkin-b",
		Status:    organization.StatusActive,
	})
	require.NoError(t, err)

	// Create a user/member in org A (required by FK on organization_memberships).
	author, err := userRepo.Create(ctx, &domainuser.User{
		ID:           uuid.New(),
		FirstName:    "Author",
		LastName:     "Test",
		Email:        "checkin-author@example.com",
		PasswordHash: "h",
		Status:       domainuser.StatusActive,
		Language:     "pt-br",
		Memberships: []organization.Membership{{
			OrganizationID: orgA.ID,
			Role:           organization.MembershipRoleSuperAdmin,
			Status:         organization.MembershipStatusActive,
		}},
	})
	require.NoError(t, err)

	// Create an indicator in org A (required by FK on indicators).
	ind, err := indRepo.Create(ctx, &indicator.Indicator{
		ID:              uuid.New(),
		OrganizationID:  orgA.ID,
		MissionID:       uuid.New(),
		OwnerID:         author.ID,
		Title:           "Retention",
		Status:          indicator.StatusActive,
		MeasurementMode: indicator.MeasurementModeManual,
		GoalType:        indicator.GoalTypeReach,
	})
	require.NoError(t, err)

	// Create check-in in org A.
	created, err := checkInRepo.Create(ctx, &domaincheckin.CheckIn{
		ID:          uuid.New(),
		OrgID:       orgA.ID,
		IndicatorID: ind.ID,
		AuthorID:    author.ID,
		Value:       "75",
		Confidence:  domaincheckin.ConfidenceHigh,
		Mentions:    []string{},
	})
	require.NoError(t, err)
	assert.Equal(t, orgA.ID, created.OrgID)
	assert.Equal(t, "75", created.Value)

	// Tenant isolation: GetByID with org B must fail.
	_, err = checkInRepo.GetByID(ctx, created.ID, orgB.ID)
	assert.ErrorIs(t, err, domaincheckin.ErrNotFound)

	// GetByID with org A works.
	got, err := checkInRepo.GetByID(ctx, created.ID, orgA.ID)
	require.NoError(t, err)
	assert.Equal(t, created.ID, got.ID)

	// ListByIndicator returns the check-in.
	listed, err := checkInRepo.ListByIndicator(ctx, orgA.ID, ind.ID, 1, 20)
	require.NoError(t, err)
	assert.Equal(t, int64(1), listed.Total)
	assert.Len(t, listed.CheckIns, 1)
	require.NotNil(t, listed.CheckIns[0].AuthorName)
	assert.Equal(t, author.FirstName, listed.CheckIns[0].AuthorName.FirstName)

	// Update changes value.
	toUpdate := *created
	toUpdate.Value = "90"
	toUpdate.Confidence = domaincheckin.ConfidenceMedium
	toUpdate.Mentions = []string{}
	updated, err := checkInRepo.Update(ctx, &toUpdate)
	require.NoError(t, err)
	assert.Equal(t, "90", updated.Value)

	// SoftDelete removes it from listings.
	require.NoError(t, checkInRepo.SoftDelete(ctx, created.ID, orgA.ID))
	_, err = checkInRepo.GetByID(ctx, created.ID, orgA.ID)
	assert.ErrorIs(t, err, domaincheckin.ErrNotFound)

	listedAfter, err := checkInRepo.ListByIndicator(ctx, orgA.ID, ind.ID, 1, 20)
	require.NoError(t, err)
	assert.Zero(t, listedAfter.Total)
}
