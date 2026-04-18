package middleware

import (
	"context"
	"net/http"
	"sync"
	"time"

	"github.com/getbud-co/bud2/backend/internal/api/httputil"
)

// RequestTimeout returns a middleware that cancels requests exceeding the given duration.
// If the handler does not complete in time, a 503 Service Unavailable is returned.
// Health check routes should be mounted before applying this middleware.
func RequestTimeout(timeout time.Duration) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx, cancel := context.WithTimeout(r.Context(), timeout)
			defer cancel()

			// Guard ensures only one response is written (handler or timeout).
			rw := &timeoutResponseWriter{ResponseWriter: w}

			done := make(chan struct{})
			go func() {
				defer close(done)
				next.ServeHTTP(rw, r.WithContext(ctx))
			}()

			select {
			case <-done:
				// Handler finished normally; flush any buffered headers.
				rw.mu.Lock()
				defer rw.mu.Unlock()
				if !rw.wroteHeader {
					w.WriteHeader(rw.code)
				}
			case <-ctx.Done():
				rw.mu.Lock()
				defer rw.mu.Unlock()
				if !rw.wroteHeader {
					rw.timedOut = true
					httputil.WriteProblem(w, http.StatusServiceUnavailable, "Service Unavailable", "request timed out")
				}
				<-done
			}
		})
	}
}

// timeoutResponseWriter wraps http.ResponseWriter to detect concurrent writes.
type timeoutResponseWriter struct {
	http.ResponseWriter
	mu          sync.Mutex
	wroteHeader bool
	timedOut    bool
	code        int
}

func (tw *timeoutResponseWriter) WriteHeader(code int) {
	tw.mu.Lock()
	defer tw.mu.Unlock()
	if tw.timedOut || tw.wroteHeader {
		return
	}
	tw.wroteHeader = true
	tw.code = code
	tw.ResponseWriter.WriteHeader(code)
}

func (tw *timeoutResponseWriter) Write(b []byte) (int, error) {
	tw.mu.Lock()
	defer tw.mu.Unlock()
	if tw.timedOut {
		return 0, nil
	}
	if !tw.wroteHeader {
		tw.wroteHeader = true
		tw.code = http.StatusOK
		tw.ResponseWriter.WriteHeader(http.StatusOK)
	}
	return tw.ResponseWriter.Write(b)
}
