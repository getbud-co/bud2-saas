package httputil

import (
	"encoding/json"
	"errors"
	"net/http"
)

// DecodeJSON decodes the request body into v.
// Returns true on success.
// On error, writes an appropriate problem response and returns false:
//   - 413 Request Entity Too Large if body exceeds the configured limit
//   - 400 Bad Request for any other JSON decode error
func DecodeJSON(w http.ResponseWriter, r *http.Request, v any) bool {
	if err := json.NewDecoder(r.Body).Decode(v); err != nil {
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			WriteProblem(w, http.StatusRequestEntityTooLarge, "Payload Too Large", "request body exceeds maximum allowed size")
			return false
		}
		WriteProblem(w, http.StatusBadRequest, "Bad Request", "invalid JSON body")
		return false
	}
	return true
}
