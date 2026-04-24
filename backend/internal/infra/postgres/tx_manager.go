package postgres

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	apptx "github.com/getbud-co/bud2/backend/internal/app/tx"
	"github.com/getbud-co/bud2/backend/internal/domain/organization"
	"github.com/getbud-co/bud2/backend/internal/domain/team"
	"github.com/getbud-co/bud2/backend/internal/domain/user"
	"github.com/getbud-co/bud2/backend/internal/infra/postgres/sqlc"
)

type txRepositories struct {
	queries *sqlc.Queries
}

func (r txRepositories) Organizations() organization.Repository {
	return NewOrgRepository(r.queries)
}

func (r txRepositories) Users() user.Repository {
	return NewUserRepository(r.queries)
}

func (r txRepositories) Teams() team.Repository {
	return NewTeamRepository(r.queries)
}

type TxManager struct {
	pool *pgxpool.Pool
}

func NewTxManager(pool *pgxpool.Pool) *TxManager {
	return &TxManager{pool: pool}
}

func (tm *TxManager) WithTx(ctx context.Context, fn func(repos apptx.Repositories) error) error {
	tx, err := tm.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	if err := fn(txRepositories{queries: sqlc.New(tx)}); err != nil {
		return err
	}

	return tx.Commit(ctx)
}
