// Package tx defines application-layer transaction contracts shared by use cases.
package tx

import (
	"context"

	"github.com/getbud-co/bud2/backend/internal/domain/indicator"
	"github.com/getbud-co/bud2/backend/internal/domain/mission"
	"github.com/getbud-co/bud2/backend/internal/domain/organization"
	"github.com/getbud-co/bud2/backend/internal/domain/tag"
	"github.com/getbud-co/bud2/backend/internal/domain/task"
	"github.com/getbud-co/bud2/backend/internal/domain/team"
	"github.com/getbud-co/bud2/backend/internal/domain/user"
)

type Repositories interface {
	Organizations() organization.Repository
	Users() user.Repository
	Teams() team.Repository
	Tags() tag.Repository
	Missions() mission.Repository
	Indicators() indicator.Repository
	Tasks() task.Repository
}

type Manager interface {
	WithTx(ctx context.Context, fn func(repos Repositories) error) error
}
