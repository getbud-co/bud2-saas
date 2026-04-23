package user

import (
	"context"
	"log/slog"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
	"github.com/getbud-co/bud2/backend/internal/domain/membership"
	usr "github.com/getbud-co/bud2/backend/internal/domain/user"
)

type GetMembershipUseCase struct {
	users  usr.Repository
	logger *slog.Logger
}

func NewGetMembershipUseCase(users usr.Repository, logger *slog.Logger) *GetMembershipUseCase {
	return &GetMembershipUseCase{users: users, logger: logger}
}

func (uc *GetMembershipUseCase) Execute(ctx context.Context, organizationID domain.TenantID, id uuid.UUID) (*membership.Membership, error) {
	u, err := uc.users.GetByIDForOrganization(ctx, id, organizationID.UUID())
	if err != nil {
		return nil, err
	}
	return u.MembershipForOrganization(organizationID.UUID())
}
