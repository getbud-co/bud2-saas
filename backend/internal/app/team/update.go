package team

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	"github.com/google/uuid"

	apptx "github.com/getbud-co/bud2/backend/internal/app/tx"
	"github.com/getbud-co/bud2/backend/internal/domain"
	domainteam "github.com/getbud-co/bud2/backend/internal/domain/team"
	domainuser "github.com/getbud-co/bud2/backend/internal/domain/user"
)

type UpdateCommand struct {
	OrganizationID domain.TenantID
	ID             uuid.UUID
	Name           string
	Description    *string
	Color          string
	Status         string
	Members        []MemberInput
}

type UpdateUseCase struct {
	teams  domainteam.Repository
	users  domainuser.Repository
	txm    apptx.Manager
	logger *slog.Logger
}

func NewUpdateUseCase(teams domainteam.Repository, users domainuser.Repository, txm apptx.Manager, logger *slog.Logger) *UpdateUseCase {
	return &UpdateUseCase{teams: teams, users: users, txm: txm, logger: logger}
}

func (uc *UpdateUseCase) Execute(ctx context.Context, cmd UpdateCommand) (*domainteam.Team, error) {
	uc.logger.DebugContext(ctx, "update team", "team_id", cmd.ID, "org_id", cmd.OrganizationID)

	hasLeader := false
	for _, m := range cmd.Members {
		if m.RoleInTeam == string(domainteam.RoleLeader) {
			hasLeader = true
			break
		}
	}
	if len(cmd.Members) > 0 && !hasLeader {
		return nil, fmt.Errorf("%w: at least one member must have role leader", domain.ErrValidation)
	}

	var result *domainteam.Team
	err := uc.txm.WithTx(ctx, func(repos apptx.Repositories) error {
		existing, err := repos.Teams().GetByID(ctx, cmd.ID, cmd.OrganizationID.UUID())
		if err != nil {
			return err
		}

		// Check name uniqueness only when name changed.
		if existing.Name != cmd.Name {
			if _, nameErr := repos.Teams().GetByName(ctx, cmd.OrganizationID.UUID(), cmd.Name); nameErr == nil {
				return domainteam.ErrNameExists
			} else if !errors.Is(nameErr, domainteam.ErrNotFound) {
				return nameErr
			}
		}

		members := make([]domainteam.TeamMember, 0, len(cmd.Members))
		for _, mi := range cmd.Members {
			role := domainteam.RoleInTeam(mi.RoleInTeam)
			if !role.IsValid() {
				return fmt.Errorf("%w: role_in_team %q is invalid", domain.ErrValidation, mi.RoleInTeam)
			}
			u, userErr := repos.Users().GetByIDForOrganization(ctx, mi.UserID, cmd.OrganizationID.UUID())
			if userErr != nil {
				if errors.Is(userErr, domainuser.ErrNotFound) {
					return fmt.Errorf("%w: user %s not found in organization", domain.ErrValidation, mi.UserID)
				}
				return userErr
			}
			if _, membershipErr := u.ActiveMembershipForOrganization(cmd.OrganizationID.UUID()); membershipErr != nil {
				return fmt.Errorf("%w: user %s must have an active membership", domain.ErrValidation, mi.UserID)
			}
			members = append(members, domainteam.TeamMember{
				UserID:     mi.UserID,
				RoleInTeam: role,
			})
		}

		existing.Name = cmd.Name
		existing.Description = cmd.Description
		existing.Color = domainteam.Color(cmd.Color)
		existing.Status = domainteam.Status(cmd.Status)
		existing.Members = members

		if err := existing.Validate(); err != nil {
			return err
		}

		updated, updateErr := repos.Teams().Update(ctx, existing)
		if updateErr != nil {
			return updateErr
		}
		result = updated
		return nil
	})
	if err != nil {
		uc.logger.WarnContext(ctx, "update team failed", "team_id", cmd.ID, "error", err)
		return nil, err
	}

	uc.logger.InfoContext(ctx, "team updated", "team_id", result.ID)
	return result, nil
}
