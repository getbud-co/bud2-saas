package user

import (
	"context"
	"log/slog"

	"github.com/google/uuid"

	apptx "github.com/getbud-co/bud2/backend/internal/app/tx"
	"github.com/getbud-co/bud2/backend/internal/domain"
	"github.com/getbud-co/bud2/backend/internal/domain/organization"
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

func (uc *UpdateMembershipUseCase) Execute(ctx context.Context, cmd UpdateMembershipCommand) (*organization.Membership, error) {
	var updatedMembership *organization.Membership
	err := uc.txm.WithTx(ctx, func(repos apptx.Repositories) error {
		u, err := repos.Users().GetByIDForOrganization(ctx, cmd.ID, cmd.OrganizationID.UUID())
		if err != nil {
			return err
		}

		m, err := u.MembershipForOrganization(cmd.OrganizationID.UUID())
		if err != nil {
			return err
		}

		m.Role = organization.MembershipRole(cmd.Role)
		m.Status = organization.MembershipStatus(cmd.Status)
		if err := m.Validate(); err != nil {
			return err
		}
		if m.Status != organization.MembershipStatusActive {
			if err := repos.Teams().SoftDeleteMemberByUser(ctx, cmd.OrganizationID.UUID(), cmd.ID); err != nil {
				return err
			}
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
