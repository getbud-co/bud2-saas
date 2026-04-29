package auth

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"

	domainauth "github.com/getbud-co/bud2/backend/internal/domain/auth"
	"github.com/getbud-co/bud2/backend/internal/domain/organization"
	"github.com/getbud-co/bud2/backend/internal/domain/user"
)

type RefreshCommand struct {
	RawToken string
}

type RefreshResult struct {
	Token        string
	RefreshToken string
	Session      Session
}

type RefreshUseCase struct {
	support authSupport
}

func NewRefreshUseCase(
	users user.Repository,
	organizations organization.Repository,
	issuer tokenIssuer,
	passwordHasher domainauth.PasswordHasher,
	refreshTokenRepo domainauth.RefreshTokenRepository,
	tokenHasher domainauth.TokenHasher,
	logger *slog.Logger,
	tokenTTL time.Duration,
	refreshTokenTTL time.Duration,
) *RefreshUseCase {
	return &RefreshUseCase{support: newAuthSupport(
		users, organizations,
		issuer, passwordHasher,
		refreshTokenRepo, tokenHasher,
		logger,
		tokenTTL,
		refreshTokenTTL,
	)}
}

func (uc *RefreshUseCase) Execute(ctx context.Context, cmd RefreshCommand) (*RefreshResult, error) {
	// Hash the incoming raw token to look it up.
	tokenHash := uc.support.tokenHasher.Hash(cmd.RawToken)

	stored, err := uc.support.refreshTokenRepo.GetByTokenHash(ctx, tokenHash)
	if err != nil {
		return nil, domainauth.ErrRefreshTokenNotFound
	}

	// Validate token state.
	if stored.RevokedAt != nil {
		// Token reuse detected — revoke all tokens for this user as a security measure.
		uc.support.logger.Warn("refresh token reuse detected, revoking all user tokens",
			"user_id", stored.UserID)
		_ = uc.support.refreshTokenRepo.RevokeAllByUserID(ctx, stored.UserID)
		return nil, domainauth.ErrRefreshTokenRevoked
	}
	if stored.ExpiresAt.Before(time.Now()) {
		return nil, domainauth.ErrRefreshTokenExpired
	}

	// Single-use rotation: revoke the consumed token immediately.
	if err := uc.support.refreshTokenRepo.RevokeByID(ctx, stored.ID); err != nil {
		return nil, fmt.Errorf("failed to revoke old refresh token: %w", err)
	}

	// Load user and session.
	u, err := uc.support.users.GetByID(ctx, stored.UserID)
	if err != nil {
		return nil, fmt.Errorf("failed to load user: %w", err)
	}
	if u.Status != user.StatusActive {
		return nil, ErrUserInactive
	}

	session, err := uc.support.loadSession(ctx, u)
	if err != nil {
		return nil, err
	}
	if stored.ActiveOrganizationID != nil {
		if active := findAccessibleOrganization(session.Organizations, *stored.ActiveOrganizationID); active != nil {
			session.ActiveOrganization = active
		}
	}

	// Issue new token pair.
	newAccessToken, err := uc.support.issueTokenForSession(session)
	if err != nil {
		return nil, fmt.Errorf("failed to issue access token: %w", err)
	}

	var activeOrganizationID *uuid.UUID
	if session.ActiveOrganization != nil {
		id := session.ActiveOrganization.ID
		activeOrganizationID = &id
	}
	newRefreshToken, err := uc.support.issueRefreshToken(ctx, u.ID, activeOrganizationID)
	if err != nil {
		return nil, fmt.Errorf("failed to issue refresh token: %w", err)
	}

	session.User = setUserPasswordHash(&session.User, "")
	uc.support.logger.Info("refresh token rotated", "user_id", u.ID)
	return &RefreshResult{Token: newAccessToken, RefreshToken: newRefreshToken, Session: *session}, nil
}
