package user

import (
	"context"
	"log/slog"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
	usr "github.com/getbud-co/bud2/backend/internal/domain/user"
)

type GetUseCase struct {
	users  usr.Repository
	logger *slog.Logger
}

func NewGetUseCase(users usr.Repository, logger *slog.Logger) *GetUseCase {
	return &GetUseCase{users: users, logger: logger}
}

func (uc *GetUseCase) Execute(ctx context.Context, organizationID domain.TenantID, id uuid.UUID) (*usr.User, error) {
	u, err := uc.users.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if err := u.EnsureAccessibleInOrganization(organizationID.UUID()); err != nil {
		return nil, err
	}
	return u, nil
}
