package role

import (
	"net/http"

	"github.com/getbud-co/bud2/backend/internal/api/httputil"
)

func handleError(w http.ResponseWriter, _ error) {
	httputil.WriteProblem(w, http.StatusInternalServerError, "Internal Server Error", "an unexpected error occurred")
}
