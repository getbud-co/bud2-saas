package testutil

import (
	"context"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/pgx/v5"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
	pgcontainer "github.com/testcontainers/testcontainers-go/modules/postgres"
)

type PostgresIntegrationEnv struct {
	Pool        *pgxpool.Pool
	DatabaseURL string
	BackendRoot string
}

func NewPostgresIntegrationEnv(t *testing.T) *PostgresIntegrationEnv {
	t.Helper()

	ctx := context.Background()
	container, err := pgcontainer.Run(ctx,
		"postgres:18-alpine",
		pgcontainer.WithDatabase("bud2_test"),
		pgcontainer.WithUsername("user"),
		pgcontainer.WithPassword("password"),
	)
	require.NoError(t, err)

	t.Cleanup(func() {
		require.NoError(t, container.Terminate(context.Background()))
	})

	databaseURL, err := container.ConnectionString(ctx, "sslmode=disable")
	require.NoError(t, err)
	require.NoError(t, waitForDatabase(ctx, databaseURL, 30*time.Second))

	backendRoot := backendRoot(t)
	runMigrationsForTest(t, databaseURL, filepath.Join(backendRoot, "migrations"))

	pool, err := pgxpool.New(ctx, databaseURL)
	require.NoError(t, err)
	require.NoError(t, pool.Ping(ctx))

	t.Cleanup(pool.Close)

	return &PostgresIntegrationEnv{
		Pool:        pool,
		DatabaseURL: databaseURL,
		BackendRoot: backendRoot,
	}
}

func waitForDatabase(ctx context.Context, databaseURL string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		pool, err := pgxpool.New(ctx, databaseURL)
		if err == nil {
			pingErr := pool.Ping(ctx)
			pool.Close()
			if pingErr == nil {
				return nil
			}
		}
		time.Sleep(500 * time.Millisecond)
	}
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()
	return pool.Ping(ctx)
}

func backendRoot(t *testing.T) string {
	t.Helper()
	_, filename, _, ok := runtime.Caller(0)
	require.True(t, ok)
	return filepath.Clean(filepath.Join(filepath.Dir(filename), "../../.."))
}

func runMigrationsForTest(t *testing.T, databaseURL, migrationsDir string) {
	t.Helper()
	migrationURL := strings.Replace(databaseURL, "postgres://", "pgx5://", 1)
	m, err := migrate.New("file://"+migrationsDir, migrationURL)
	require.NoError(t, err)
	t.Cleanup(func() {
		sourceErr, databaseErr := m.Close()
		require.NoError(t, sourceErr)
		require.NoError(t, databaseErr)
	})

	err = m.Up()
	if err != nil && err != migrate.ErrNoChange {
		require.NoError(t, err)
	}
}
