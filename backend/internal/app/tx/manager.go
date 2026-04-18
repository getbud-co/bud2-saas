// Package tx defines application-layer transaction contracts shared by use cases.
package tx

import (
	"context"

	"github.com/getbud-co/bud2/backend/internal/domain/organization"
	"github.com/getbud-co/bud2/backend/internal/domain/user"
)

type Repositories interface {
	Organizations() organization.Repository
	Users() user.Repository
}

type Manager interface {
	WithTx(ctx context.Context, fn func(repos Repositories) error) error
}
