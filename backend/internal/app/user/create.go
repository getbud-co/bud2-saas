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
	"github.com/getbud-co/bud2/backend/internal/domain/membership"
	"github.com/getbud-co/bud2/backend/internal/domain/organization"
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

func (uc *CreateUseCase) Execute(ctx context.Context, cmd CreateCommand) (*usr.User, error) {
	role := membership.Role(cmd.Role)
	if !role.IsValid() {
		return nil, domain.ErrValidation
	}

	existingUser, err := uc.users.GetByEmail(ctx, cmd.Email)
	if err != nil && !errors.Is(err, usr.ErrNotFound) {
		return nil, err
	}

	targetUser := existingUser
	passwordHash := ""
	if errors.Is(err, usr.ErrNotFound) {
		if _, orgErr := uc.organizations.GetByDomain(ctx, emailDomain(cmd.Email)); orgErr != nil {
			return nil, fmt.Errorf("native organization not found for email domain: %w", orgErr)
		}
		var hashErr error
		passwordHash, hashErr = uc.passwordHasher.Hash(cmd.Password)
		if hashErr != nil {
			return nil, fmt.Errorf("invalid password: %w", hashErr)
		}
	}

	lang := cmd.Language
	if lang == "" {
		lang = "pt-br"
	}

	err = uc.txm.WithTx(ctx, func(repos apptx.Repositories) error {
		var txErr error
		if targetUser == nil {
			targetUser = &usr.User{
				ID:            uuid.New(),
				FirstName:     cmd.FirstName,
				LastName:      cmd.LastName,
				Email:         cmd.Email,
				PasswordHash:  passwordHash,
				Status:        usr.StatusActive,
				IsSystemAdmin: false,
				Nickname:      cmd.Nickname,
				JobTitle:      cmd.JobTitle,
				BirthDate:     cmd.BirthDate,
				Language:      lang,
				Gender:        cmd.Gender,
				Phone:         cmd.Phone,
			}
			if txErr = targetUser.AddMembership(membership.Membership{
				OrganizationID: cmd.OrganizationID.UUID(),
				Role:           role,
				Status:         membership.StatusInvited,
			}); txErr != nil {
				return txErr
			}
			targetUser, txErr = repos.Users().Create(ctx, targetUser)
			if txErr != nil {
				return txErr
			}
		} else {
			if _, txErr = targetUser.MembershipForOrganization(cmd.OrganizationID.UUID()); txErr == nil {
				return membership.ErrAlreadyExists
			} else if !errors.Is(txErr, membership.ErrNotFound) {
				return txErr
			}
			if txErr = targetUser.AddMembership(membership.Membership{
				OrganizationID: cmd.OrganizationID.UUID(),
				Role:           role,
				Status:         membership.StatusInvited,
			}); txErr != nil {
				return txErr
			}
			targetUser, txErr = repos.Users().Update(ctx, targetUser)
			if txErr != nil {
				return txErr
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return targetUser, nil
}
