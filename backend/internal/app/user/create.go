package user

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"

	apptx "github.com/getbud-co/bud2/backend/internal/app/tx"
	"github.com/getbud-co/bud2/backend/internal/domain"
	domainauth "github.com/getbud-co/bud2/backend/internal/domain/auth"
	"github.com/getbud-co/bud2/backend/internal/domain/organization"
	domainteam "github.com/getbud-co/bud2/backend/internal/domain/team"
	usr "github.com/getbud-co/bud2/backend/internal/domain/user"
)

type CreateCommand struct {
	OrganizationID domain.TenantID
	FirstName      string
	LastName       string
	Email          string
	Password       string
	Role           string
	Nickname       *string
	JobTitle       *string
	BirthDate      *time.Time
	Language       string
	Gender         *string
	Phone          *string
	TeamIDs        []uuid.UUID
}

type CreateUseCase struct {
	users          usr.Repository
	organizations  organization.Repository
	txm            apptx.Manager
	passwordHasher domainauth.PasswordHasher
	logger         *slog.Logger
}

func NewCreateUseCase(users usr.Repository, organizations organization.Repository, txm apptx.Manager, passwordHasher domainauth.PasswordHasher, logger *slog.Logger) *CreateUseCase {
	return &CreateUseCase{users: users, organizations: organizations, txm: txm, passwordHasher: passwordHasher, logger: logger}
}

func (uc *CreateUseCase) Execute(ctx context.Context, cmd CreateCommand) (*usr.User, []uuid.UUID, error) {
	role := organization.MembershipRole(cmd.Role)
	if !role.IsValid() {
		return nil, nil, domain.ErrValidation
	}

	existingUser, err := uc.users.GetByEmail(ctx, cmd.Email)
	if err != nil && !errors.Is(err, usr.ErrNotFound) {
		return nil, nil, err
	}

	targetUser := existingUser
	passwordHash := ""
	if errors.Is(err, usr.ErrNotFound) {
		if _, orgErr := uc.organizations.GetByDomain(ctx, emailDomain(cmd.Email)); orgErr != nil {
			return nil, nil, fmt.Errorf("native organization not found for email domain: %w", orgErr)
		}
		var hashErr error
		passwordHash, hashErr = uc.passwordHasher.Hash(cmd.Password)
		if hashErr != nil {
			return nil, nil, fmt.Errorf("invalid password: %w", hashErr)
		}
	}

	var resultTeamIDs []uuid.UUID
	err = uc.txm.WithTx(ctx, func(repos apptx.Repositories) error {
		var txErr error
		if targetUser == nil {
			opts := []usr.UserOption{
				usr.WithNickname(cmd.Nickname),
				usr.WithJobTitle(cmd.JobTitle),
				usr.WithBirthDate(cmd.BirthDate),
				usr.WithGender(cmd.Gender),
				usr.WithPhone(cmd.Phone),
			}
			if cmd.Language != "" {
				opts = append(opts, usr.WithLanguage(cmd.Language))
			}
			targetUser, txErr = usr.NewUser(cmd.Email, cmd.FirstName, cmd.LastName, passwordHash, opts...)
			if txErr != nil {
				return txErr
			}
			if txErr = targetUser.AddMembership(organization.Membership{
				OrganizationID: cmd.OrganizationID.UUID(),
				Role:           role,
				Status:         organization.MembershipStatusInvited,
			}); txErr != nil {
				return txErr
			}
			targetUser, txErr = repos.Users().Create(ctx, targetUser)
			if txErr != nil {
				return txErr
			}
		} else {
			if _, txErr = targetUser.MembershipForOrganization(cmd.OrganizationID.UUID()); txErr == nil {
				return organization.ErrMembershipAlreadyExists
			} else if !errors.Is(txErr, organization.ErrMembershipNotFound) {
				return txErr
			}
			if txErr = targetUser.AddMembership(organization.Membership{
				OrganizationID: cmd.OrganizationID.UUID(),
				Role:           role,
				Status:         organization.MembershipStatusInvited,
			}); txErr != nil {
				return txErr
			}
			targetUser, txErr = repos.Users().Update(ctx, targetUser)
			if txErr != nil {
				return txErr
			}
		}
		if len(cmd.TeamIDs) > 0 {
			if txErr = repos.Teams().SyncMembersByUser(ctx, cmd.OrganizationID.UUID(), targetUser.ID, cmd.TeamIDs, domainteam.RoleMember); txErr != nil {
				return txErr
			}
		}
		resultTeamIDs = cmd.TeamIDs
		return nil
	})
	if err != nil {
		return nil, nil, err
	}

	return targetUser, resultTeamIDs, nil
}
