package bootstrap

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	apptx "github.com/getbud-co/bud2/backend/internal/app/tx"
	"github.com/getbud-co/bud2/backend/internal/domain"
	domainauth "github.com/getbud-co/bud2/backend/internal/domain/auth"
	"github.com/getbud-co/bud2/backend/internal/domain/organization"
	"github.com/getbud-co/bud2/backend/internal/domain/user"
)

var ErrAlreadyBootstrapped = errors.New("bootstrap already completed")

type Command struct {
	OrganizationName      string
	OrganizationDomain    string
	OrganizationWorkspace string
	AdminFirstName        string
	AdminLastName         string
	AdminEmail            string
	AdminPassword         string
}

type Result struct {
	Organization organization.Organization
	Admin        user.User
	AccessToken  string
}

type TokenIssuer interface {
	IssueToken(claims domain.UserClaims, ttl time.Duration) (string, error)
}

type UseCase struct {
	orgRepo        organization.Repository
	txm            apptx.Manager
	issuer         TokenIssuer
	passwordHasher domainauth.PasswordHasher
	tokenTTL       time.Duration
	logger         *slog.Logger
}

func NewUseCase(orgRepo organization.Repository, txm apptx.Manager, issuer TokenIssuer, passwordHasher domainauth.PasswordHasher, logger *slog.Logger) *UseCase {
	return &UseCase{
		orgRepo:        orgRepo,
		txm:            txm,
		issuer:         issuer,
		passwordHasher: passwordHasher,
		tokenTTL:       24 * time.Hour,
		logger:         logger,
	}
}

func (uc *UseCase) Execute(ctx context.Context, cmd Command) (*Result, error) {
	uc.logger.Debug("starting bootstrap", "organization_name", cmd.OrganizationName, "admin_email", cmd.AdminEmail)

	count, err := uc.orgRepo.CountAll(ctx)
	if err != nil {
		uc.logger.Error("failed to count organizations", "error", err)
		return nil, err
	}
	if count > 0 {
		uc.logger.Warn("bootstrap already completed", "organization_count", count)
		return nil, ErrAlreadyBootstrapped
	}

	var createdOrg *organization.Organization
	var createdAdmin *user.User
	var createdMembership *organization.Membership

	passwordHash, err := uc.passwordHasher.Hash(cmd.AdminPassword)
	if err != nil {
		uc.logger.Error("failed to hash admin password", "error", err)
		return nil, fmt.Errorf("invalid admin password: %w", err)
	}

	err = uc.txm.WithTx(ctx, func(repos apptx.Repositories) error {
		var txErr error
		newOrg, newOrgErr := organization.NewOrganization(
			cmd.OrganizationName,
			strings.ToLower(strings.TrimSpace(cmd.OrganizationDomain)),
			strings.TrimSpace(cmd.OrganizationWorkspace),
		)
		if newOrgErr != nil {
			return newOrgErr
		}
		createdOrg, txErr = repos.Organizations().Create(ctx, newOrg)
		if txErr != nil {
			uc.logger.Error("failed to create organization in transaction", "error", txErr)
			return txErr
		}

		admin, newAdminErr := user.NewUser(cmd.AdminEmail, cmd.AdminFirstName, cmd.AdminLastName, passwordHash)
		if newAdminErr != nil {
			uc.logger.Warn("admin validation failed", "error", newAdminErr, "email", cmd.AdminEmail)
			return newAdminErr
		}
		if txErr = admin.AddMembership(organization.Membership{
			OrganizationID: createdOrg.ID,
			Role:           organization.MembershipRoleSuperAdmin,
			Status:         organization.MembershipStatusActive,
		}); txErr != nil {
			return txErr
		}

		createdAdmin, txErr = repos.Users().Create(ctx, admin)
		if txErr == nil {
			createdMembership, txErr = createdAdmin.MembershipForOrganization(createdOrg.ID)
		}
		return txErr
	})
	if err != nil {
		uc.logger.Error("bootstrap transaction failed", "error", err)
		return nil, err
	}

	token, err := uc.issuer.IssueToken(domain.UserClaims{
		UserID:                domain.UserID(createdAdmin.ID),
		ActiveOrganizationID:  domain.TenantID(createdOrg.ID),
		HasActiveOrganization: true,
		MembershipRole:        string(createdMembership.Role),
		IsSystemAdmin:         createdAdmin.IsSystemAdmin,
	}, uc.tokenTTL)
	if err != nil {
		uc.logger.Error("failed to generate bootstrap token", "error", err, "user_id", createdAdmin.ID)
		return nil, err
	}

	uc.logger.Info("bootstrap completed", "organization_id", createdOrg.ID, "admin_id", createdAdmin.ID, "organization_name", cmd.OrganizationName)

	return &Result{
		Organization: *createdOrg,
		Admin:        *createdAdmin,
		AccessToken:  token,
	}, nil
}
