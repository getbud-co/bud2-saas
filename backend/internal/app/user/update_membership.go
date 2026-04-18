package user

import (
	"context"
	"log/slog"

	"github.com/google/uuid"

	apptx "github.com/getbud-co/bud2/backend/internal/app/tx"
	"github.com/getbud-co/bud2/backend/internal/domain"
	"github.com/getbud-co/bud2/backend/internal/domain/membership"
)

type UpdateMembershipCommand struct {
	OrganizationID domain.TenantID
	ID             uuid.UUID
	Role           string
	Status         string
}

type UpdateMembershipUseCase struct {
	txm    apptx.Manager
	logger *slog.Logger
}

func NewUpdateMembershipUseCase(txm apptx.Manager, logger *slog.Logger) *UpdateMembershipUseCase {
	return &UpdateMembershipUseCase{txm: txm, logger: logger}
}

func (uc *UpdateMembershipUseCase) Execute(ctx context.Context, cmd UpdateMembershipCommand) (*membership.Membership, error) {
	var updatedMembership *membership.Membership
	err := uc.txm.WithTx(ctx, func(repos apptx.Repositories) error {
		u, err := repos.Users().GetByID(ctx, cmd.ID)
		if err != nil {
			return err
		}

		m, err := u.MembershipForOrganization(cmd.OrganizationID.UUID())
		if err != nil {
			return err
		}

		m.Role = membership.Role(cmd.Role)
		m.Status = membership.Status(cmd.Status)
		if err := m.Validate(); err != nil {
			return err
		}

		u, err = repos.Users().Update(ctx, u)
		if err != nil {
			return err
		}

		updatedMembership, err = u.MembershipForOrganization(cmd.OrganizationID.UUID())
		return err
	})
	if err != nil {
		return nil, err
	}
	return updatedMembership, nil
}
