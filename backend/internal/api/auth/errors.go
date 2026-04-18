package auth

import (
	"errors"
	"net/http"

	"github.com/getbud-co/bud2/backend/internal/api/httputil"
	appauth "github.com/getbud-co/bud2/backend/internal/app/auth"
	domainauth "github.com/getbud-co/bud2/backend/internal/domain/auth"
)

func handleAuthError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, appauth.ErrInvalidCredentials):
		httputil.WriteProblem(w, http.StatusUnauthorized, "Unauthorized", "invalid credentials")
	case errors.Is(err, appauth.ErrUserInactive):
		httputil.WriteProblem(w, http.StatusForbidden, "Forbidden", "user account is inactive")
	case errors.Is(err, appauth.ErrNoOrganizations):
		httputil.WriteProblem(w, http.StatusForbidden, "Forbidden", "user has no accessible organizations")
	case errors.Is(err, domainauth.ErrRefreshTokenNotFound),
		errors.Is(err, domainauth.ErrRefreshTokenRevoked),
		errors.Is(err, domainauth.ErrRefreshTokenExpired):
		httputil.WriteProblem(w, http.StatusUnauthorized, "Unauthorized", err.Error())
	default:
		httputil.WriteProblem(w, http.StatusInternalServerError, "Internal Server Error", "an unexpected error occurred")
	}
}
