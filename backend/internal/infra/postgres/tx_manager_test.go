//go:build integration

package postgres

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	apptx "github.com/getbud-co/bud2/backend/internal/app/tx"
	"github.com/getbud-co/bud2/backend/internal/domain/organization"
	"github.com/getbud-co/bud2/backend/internal/infra/postgres/sqlc"
	"github.com/getbud-co/bud2/backend/internal/test/testutil"
)

func TestTxManager_WithTx_CommitsOnSuccess(t *testing.T) {
	env := testutil.NewPostgresIntegrationEnv(t)
	txManager := NewTxManager(env.Pool)
	ctx := context.Background()

	err := txManager.WithTx(ctx, func(repos apptx.Repositories) error {
		_, createErr := repos.Organizations().Create(ctx, &organization.Organization{
			Name:      "Committed",
			Domain:    "committed.example.com",
			Workspace: "committed",
			Status:    organization.StatusActive,
		})
		return createErr
	})

	require.NoError(t, err)
	count, err := NewOrgRepository(sqlc.New(env.Pool)).CountAll(ctx)
	require.NoError(t, err)
	assert.Equal(t, int64(1), count)
}

func TestTxManager_WithTx_RollsBackOnError(t *testing.T) {
	env := testutil.NewPostgresIntegrationEnv(t)
	txManager := NewTxManager(env.Pool)
	ctx := context.Background()

	err := txManager.WithTx(ctx, func(repos apptx.Repositories) error {
		_, createErr := repos.Organizations().Create(ctx, &organization.Organization{
			Name:      "Rolled Back",
			Domain:    "rollback.example.com",
			Workspace: "rollback",
			Status:    organization.StatusActive,
		})
		if createErr != nil {
			return createErr
		}
		return errors.New("force rollback")
	})

	require.EqualError(t, err, "force rollback")
	count, countErr := NewOrgRepository(sqlc.New(env.Pool)).CountAll(ctx)
	require.NoError(t, countErr)
	assert.Equal(t, int64(0), count)
}
