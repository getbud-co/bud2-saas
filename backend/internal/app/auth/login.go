package auth

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"

	domainauth "github.com/getbud-co/bud2/backend/internal/domain/auth"
	"github.com/getbud-co/bud2/backend/internal/domain/organization"
	"github.com/getbud-co/bud2/backend/internal/domain/user"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrUserInactive       = errors.New("user account is inactive")
	ErrNoOrganizations    = errors.New("user has no accessible organizations")
)

type LoginCommand struct {
	Email    string
	Password string
}

type LoginResult struct {
	Token        string
	RefreshToken string
	Session      Session
}

type LoginUseCase struct {
	support authSupport
}

func NewLoginUseCase(
	users user.Repository,
	organizations organization.Repository,
	issuer tokenIssuer,
	passwordHasher domainauth.PasswordHasher,
	refreshTokenRepo domainauth.RefreshTokenRepository,
	tokenHasher domainauth.TokenHasher,
	logger *slog.Logger,
	tokenTTL time.Duration,
	refreshTokenTTL time.Duration,
) *LoginUseCase {
	return &LoginUseCase{support: newAuthSupport(
		users, organizations,
		issuer, passwordHasher,
		refreshTokenRepo, tokenHasher,
		logger,
		tokenTTL,
		refreshTokenTTL,
	)}
}

func (uc *LoginUseCase) Execute(ctx context.Context, cmd LoginCommand) (*LoginResult, error) {
	uc.support.logger.Debug("login attempt", "email", cmd.Email)

	u, err := uc.support.users.GetByEmail(ctx, cmd.Email)
	if err != nil {
		if errors.Is(err, user.ErrNotFound) {
			uc.support.logger.Warn("login failed - invalid credentials", "email", cmd.Email)
			return nil, ErrInvalidCredentials
		}
		return nil, fmt.Errorf("failed to find user: %w", err)
	}

	if !uc.support.passwordHasher.Verify(cmd.Password, u.PasswordHash) {
		uc.support.logger.Warn("login failed - invalid credentials", "email", cmd.Email)
		return nil, ErrInvalidCredentials
	}
	if u.Status != user.StatusActive {
		uc.support.logger.Warn("login failed - user inactive", "email", cmd.Email, "user_id", u.ID)
		return nil, ErrUserInactive
	}

	// Activate any pending invited memberships across all organizations for this
	// user. This runs outside a transaction intentionally: the operation is
	// idempotent (WHERE status = 'invited') and self-healing on the next login
	// attempt if loadSession fails after activation. Cross-org scope is accepted
	// because membership activation must happen before we can determine which
	// organizations the user can access.
	if err = uc.support.users.ActivateInvitedMemberships(ctx, u.ID); err != nil {
		return nil, fmt.Errorf("failed to activate invited memberships: %w", err)
	}
	// Reflect the activation in memory so loadSession sees active memberships
	// without an extra round-trip to the database.
	for i := range u.Memberships {
		if u.Memberships[i].Status == organization.MembershipStatusInvited {
			u.Memberships[i].Status = organization.MembershipStatusActive
		}
	}

	session, err := uc.support.loadSession(ctx, u)
	if err != nil {
		if errors.Is(err, ErrNoOrganizations) {
			return nil, err
		}
		return nil, fmt.Errorf("failed to load session: %w", err)
	}

	token, err := uc.support.issueTokenForSession(session)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	var activeOrganizationID *uuid.UUID
	if session.ActiveOrganization != nil {
		id := session.ActiveOrganization.ID
		activeOrganizationID = &id
	}
	refreshToken, err := uc.support.issueRefreshToken(ctx, session.User.ID, activeOrganizationID)
	if err != nil {
		return nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	session.User = setUserPasswordHash(&session.User, "")
	uc.support.logger.Info("login successful", "user_id", session.User.ID, "active_organization", session.ActiveOrganization != nil)
	return &LoginResult{Token: token, RefreshToken: refreshToken, Session: *session}, nil
}
