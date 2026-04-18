package auth

import (
	"context"
	"fmt"
	"log/slog"

	domainauth "github.com/getbud-co/bud2/backend/internal/domain/auth"
	"github.com/getbud-co/bud2/backend/internal/domain/organization"
	"github.com/getbud-co/bud2/backend/internal/domain/user"

	"github.com/getbud-co/bud2/backend/internal/domain"
)

type GetSessionUseCase struct {
	support authSupport
}

func NewGetSessionUseCase(
	users user.Repository,
	organizations organization.Repository,
	issuer tokenIssuer,
	passwordHasher domainauth.PasswordHasher,
	logger *slog.Logger,
) *GetSessionUseCase {
	// GetSession does not issue tokens; refresh token repo/hasher are not needed.
	return &GetSessionUseCase{support: newAuthSupport(
		users, organizations,
		issuer, passwordHasher,
		nil, nil,
		logger,
		0, 0,
	)}
}

func (uc *GetSessionUseCase) Execute(ctx context.Context, claims domain.UserClaims) (*Session, error) {
	u, err := uc.support.users.GetByID(ctx, claims.UserID.UUID())
	if err != nil {
		return nil, fmt.Errorf("failed to load user: %w", err)
	}
	session, err := uc.support.loadSession(ctx, u)
	if err != nil {
		return nil, err
	}
	if claims.HasActiveOrganization {
		if active := findAccessibleOrganization(session.Organizations, claims.ActiveOrganizationID.UUID()); active != nil {
			session.ActiveOrganization = active
		}
	}
	session.User = setUserPasswordHash(&session.User, "")
	return session, nil
}
