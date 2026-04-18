package middleware

import (
	"net/http"
)

// BodySizeLimit returns a middleware that limits the size of request bodies.
// Requests exceeding maxBytes will cause json.Decode to return *http.MaxBytesError.
func BodySizeLimit(maxBytes int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Body != nil {
				r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
			}
			next.ServeHTTP(w, r)
		})
	}
}
