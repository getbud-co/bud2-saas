package bootstrap

import (
	"errors"
	"net/http"

	"github.com/getbud-co/bud2/backend/internal/api/httputil"
	appbootstrap "github.com/getbud-co/bud2/backend/internal/app/bootstrap"
)

func handleError(w http.ResponseWriter, err error) bool {
	if errors.Is(err, appbootstrap.ErrAlreadyBootstrapped) {
		httputil.WriteProblem(w, http.StatusConflict, "Conflict", err.Error())
		return true
	}
	return false
}
