package auth

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/getbud-co/bud2/backend/internal/domain"
	domainauth "github.com/getbud-co/bud2/backend/internal/domain/auth"
	"github.com/getbud-co/bud2/backend/internal/domain/organization"
	"github.com/getbud-co/bud2/backend/internal/domain/user"
)

type tokenIssuer interface {
	IssueToken(claims domain.UserClaims, ttl time.Duration) (string, error)
}

type authSupport struct {
	users            user.Repository
	organizations    organization.Repository
	issuer           tokenIssuer
	passwordHasher   domainauth.PasswordHasher
	refreshTokenRepo domainauth.RefreshTokenRepository
	tokenHasher      domainauth.TokenHasher
	logger           *slog.Logger
	tokenTTL         time.Duration
	refreshTokenTTL  time.Duration
}

func newAuthSupport(
	users user.Repository,
	organizations organization.Repository,
	issuer tokenIssuer,
	passwordHasher domainauth.PasswordHasher,
	refreshTokenRepo domainauth.RefreshTokenRepository,
	tokenHasher domainauth.TokenHasher,
	logger *slog.Logger,
	tokenTTL time.Duration,
	refreshTokenTTL time.Duration,
) authSupport {
	return authSupport{
		users:            users,
		organizations:    organizations,
		issuer:           issuer,
		passwordHasher:   passwordHasher,
		refreshTokenRepo: refreshTokenRepo,
		tokenHasher:      tokenHasher,
		logger:           logger,
		tokenTTL:         tokenTTL,
		refreshTokenTTL:  refreshTokenTTL,
	}
}

// issueRefreshToken generates a cryptographically random opaque token,
// hashes it, persists the hash, and returns the raw token to send to the client.
func (s authSupport) issueRefreshToken(ctx context.Context, userID uuid.UUID, activeOrganizationID *uuid.UUID) (string, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", fmt.Errorf("failed to generate refresh token: %w", err)
	}
	rawToken := base64.RawURLEncoding.EncodeToString(raw)
	tokenHash := s.tokenHasher.Hash(rawToken)

	_, err := s.refreshTokenRepo.Create(ctx, &domainauth.RefreshToken{
		ID:                   uuid.New(),
		UserID:               userID,
		ActiveOrganizationID: activeOrganizationID,
		TokenHash:            tokenHash,
		ExpiresAt:            time.Now().Add(s.refreshTokenTTL),
	})
	if err != nil {
		return "", fmt.Errorf("failed to store refresh token: %w", err)
	}
	return rawToken, nil
}

func (s authSupport) loadSession(ctx context.Context, u *user.User) (*Session, error) {
	var organizations []AccessibleOrganization

	if u.IsSystemAdmin {
		result, err := s.organizations.List(ctx, organization.ListFilter{Page: 1, Size: 1000})
		if err != nil {
			return nil, fmt.Errorf("failed to list organizations: %w", err)
		}
		organizations = make([]AccessibleOrganization, len(result.Organizations))
		for i := range result.Organizations {
			organizations[i] = accessibleOrganizationFromOrganization(&result.Organizations[i])
		}
		return &Session{User: *u, Organizations: organizations}, nil
	}

	activeMemberships := make([]organization.Membership, 0, len(u.Memberships))
	for i := range u.Memberships {
		if u.Memberships[i].Status == organization.MembershipStatusActive {
			activeMemberships = append(activeMemberships, u.Memberships[i])
		}
	}
	if len(activeMemberships) == 0 {
		return nil, ErrNoOrganizations
	}

	organizations = make([]AccessibleOrganization, 0, len(activeMemberships))
	for i := range activeMemberships {
		m := activeMemberships[i]
		org, err := s.organizations.GetByID(ctx, m.OrganizationID)
		if err != nil {
			return nil, fmt.Errorf("failed to load organization %s: %w", m.OrganizationID, err)
		}
		organizations = append(organizations, accessibleOrganizationFromMembership(org, &m))
	}

	activeOrg := chooseActiveOrganization(u.Email, organizations)
	if activeOrg == nil {
		return nil, ErrNoOrganizations
	}

	return &Session{User: *u, ActiveOrganization: activeOrg, Organizations: organizations}, nil
}

func (s authSupport) buildClaims(session *Session) domain.UserClaims {
	claims := domain.UserClaims{
		UserID:        domain.UserID(session.User.ID),
		IsSystemAdmin: session.User.IsSystemAdmin,
	}
	if session.ActiveOrganization != nil {
		claims.ActiveOrganizationID = domain.TenantID(session.ActiveOrganization.ID)
		claims.HasActiveOrganization = true
		claims.MembershipRole = session.ActiveOrganization.MembershipRole
	}
	return claims
}

func (s authSupport) issueTokenForSession(session *Session) (string, error) {
	return s.issuer.IssueToken(s.buildClaims(session), s.tokenTTL)
}

func chooseActiveOrganization(email string, organizations []AccessibleOrganization) *AccessibleOrganization {
	if len(organizations) == 0 {
		return nil
	}
	domainPart := emailDomain(email)
	if domainPart != "" {
		for i := range organizations {
			if strings.EqualFold(organizations[i].Domain, domainPart) {
				return &organizations[i]
			}
		}
	}
	return &organizations[0]
}

func emailDomain(email string) string {
	parts := strings.Split(strings.TrimSpace(email), "@")
	if len(parts) != 2 {
		return ""
	}
	return strings.ToLower(parts[1])
}

func setUserPasswordHash(u *user.User, value string) user.User {
	copy := *u
	copy.PasswordHash = value
	return copy
}

func findAccessibleOrganization(organizations []AccessibleOrganization, organizationID uuid.UUID) *AccessibleOrganization {
	for i := range organizations {
		if organizations[i].ID == organizationID {
			return &organizations[i]
		}
	}
	return nil
}
