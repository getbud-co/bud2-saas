package auth

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domainauth "github.com/getbud-co/bud2/backend/internal/domain/auth"
	"github.com/getbud-co/bud2/backend/internal/domain/organization"
	"github.com/getbud-co/bud2/backend/internal/domain/user"
)

type SwitchOrganizationCommand struct {
	OrganizationID uuid.UUID
}

type SwitchOrganizationResult struct {
	Token        string
	RefreshToken string
	Session      Session
}

type SwitchOrganizationUseCase struct {
	support authSupport
}

func NewSwitchOrganizationUseCase(
	users user.Repository,
	organizations organization.Repository,
	issuer tokenIssuer,
	passwordHasher domainauth.PasswordHasher,
	refreshTokenRepo domainauth.RefreshTokenRepository,
	tokenHasher domainauth.TokenHasher,
	logger *slog.Logger,
	tokenTTL time.Duration,
	refreshTokenTTL time.Duration,
) *SwitchOrganizationUseCase {
	return &SwitchOrganizationUseCase{support: newAuthSupport(
		users, organizations,
		issuer, passwordHasher,
		refreshTokenRepo, tokenHasher,
		logger,
		tokenTTL,
		refreshTokenTTL,
	)}
}

func (uc *SwitchOrganizationUseCase) Execute(ctx context.Context, claims domain.UserClaims, cmd SwitchOrganizationCommand) (*SwitchOrganizationResult, error) {
	u, err := uc.support.users.GetByID(ctx, claims.UserID.UUID())
	if err != nil {
		return nil, fmt.Errorf("failed to load user: %w", err)
	}
	session, err := uc.support.loadSession(ctx, u)
	if err != nil {
		return nil, err
	}
	active := findAccessibleOrganization(session.Organizations, cmd.OrganizationID)
	if active == nil {
		if !u.IsSystemAdmin {
			return nil, ErrNoOrganizations
		}
		org, err := uc.support.organizations.GetByID(ctx, cmd.OrganizationID)
		if err != nil {
			return nil, fmt.Errorf("failed to load target organization: %w", err)
		}
		orgSummary := accessibleOrganizationFromOrganization(org)
		active = &orgSummary
		found := false
		for i := range session.Organizations {
			if session.Organizations[i].ID == orgSummary.ID {
				found = true
				break
			}
		}
		if !found {
			session.Organizations = append(session.Organizations, orgSummary)
		}
	}
	session.ActiveOrganization = active
	token, err := uc.support.issueTokenForSession(session)
	if err != nil {
		return nil, fmt.Errorf("failed to issue token: %w", err)
	}
	var activeOrganizationID *uuid.UUID
	if session.ActiveOrganization != nil {
		id := session.ActiveOrganization.ID
		activeOrganizationID = &id
	}
	refreshToken, err := uc.support.issueRefreshToken(ctx, session.User.ID, activeOrganizationID)
	if err != nil {
		return nil, fmt.Errorf("failed to issue refresh token: %w", err)
	}
	session.User = setUserPasswordHash(&session.User, "")
	return &SwitchOrganizationResult{Token: token, RefreshToken: refreshToken, Session: *session}, nil
}
