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

type MemberInput struct {
	UserID     uuid.UUID
	RoleInTeam string
}

type CreateCommand struct {
	OrganizationID domain.TenantID
	Name           string
	Description    *string
	Color          string
	Members        []MemberInput
}

type CreateUseCase struct {
	teams  domainteam.Repository
	users  domainuser.Repository
	txm    apptx.Manager
	logger *slog.Logger
}

func NewCreateUseCase(teams domainteam.Repository, users domainuser.Repository, txm apptx.Manager, logger *slog.Logger) *CreateUseCase {
	return &CreateUseCase{teams: teams, users: users, txm: txm, logger: logger}
}

func (uc *CreateUseCase) Execute(ctx context.Context, cmd CreateCommand) (*domainteam.Team, error) {
	uc.logger.DebugContext(ctx, "create team", "org_id", cmd.OrganizationID, "name", cmd.Name)

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
		_, err := repos.Teams().GetByName(ctx, cmd.OrganizationID.UUID(), cmd.Name)
		if err == nil {
			return domainteam.ErrNameExists
		}
		if !errors.Is(err, domainteam.ErrNotFound) {
			return err
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

		t := &domainteam.Team{
			ID:             uuid.New(),
			OrganizationID: cmd.OrganizationID.UUID(),
			Name:           cmd.Name,
			Description:    cmd.Description,
			Color:          domainteam.Color(cmd.Color),
			Status:         domainteam.StatusActive,
			Members:        members,
		}
		if err := t.Validate(); err != nil {
			return err
		}

		created, createErr := repos.Teams().Create(ctx, t)
		if createErr != nil {
			return createErr
		}
		result = created
		return nil
	})
	if err != nil {
		uc.logger.WarnContext(ctx, "create team failed", "error", err)
		return nil, err
	}

	uc.logger.InfoContext(ctx, "team created", "team_id", result.ID)
	return result, nil
}
