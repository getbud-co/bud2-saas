package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/getbud-co/bud2/backend/internal/api/httputil"
)

// RateLimiter implements a simple in-memory rate limiter per IP
type RateLimiter struct {
	requests map[string][]time.Time
	limit    int
	window   time.Duration
	mu       sync.RWMutex
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		requests: make(map[string][]time.Time),
		limit:    limit,
		window:   window,
	}
	// Start cleanup goroutine
	go rl.cleanup()
	return rl
}

// Allow checks if a request from the given key is allowed
func (rl *RateLimiter) Allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-rl.window)

	// Get existing requests for this key
	timestamps := rl.requests[key]

	// Filter out old requests
	var valid []time.Time
	for _, ts := range timestamps {
		if ts.After(cutoff) {
			valid = append(valid, ts)
		}
	}

	// Check if under limit
	if len(valid) >= rl.limit {
		rl.requests[key] = valid
		return false
	}

	// Add current request
	valid = append(valid, now)
	rl.requests[key] = valid
	return true
}

// cleanup removes old entries periodically
func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		rl.mu.Lock()
		cutoff := time.Now().Add(-rl.window)
		for key, timestamps := range rl.requests {
			var valid []time.Time
			for _, ts := range timestamps {
				if ts.After(cutoff) {
					valid = append(valid, ts)
				}
			}
			if len(valid) == 0 {
				delete(rl.requests, key)
			} else {
				rl.requests[key] = valid
			}
		}
		rl.mu.Unlock()
	}
}

// RateLimit middleware applies rate limiting based on IP address
func RateLimit(limit int, window time.Duration) func(http.Handler) http.Handler {
	limiter := NewRateLimiter(limit, window)

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Get client IP
			ip := r.RemoteAddr
			if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
				ip = forwarded
			}

			if !limiter.Allow(ip) {
				httputil.WriteProblem(w, http.StatusTooManyRequests, "Too Many Requests", "rate limit exceeded")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
