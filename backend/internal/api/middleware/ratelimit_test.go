package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestRateLimiter_Allow(t *testing.T) {
	limiter := NewRateLimiter(5, time.Minute)

	// Should allow first 5 requests
	for i := 0; i < 5; i++ {
		assert.True(t, limiter.Allow("test-key"), "Request %d should be allowed", i+1)
	}

	// 6th request should be blocked
	assert.False(t, limiter.Allow("test-key"), "Request 6 should be blocked")
}

func TestRateLimiter_DifferentKeys(t *testing.T) {
	limiter := NewRateLimiter(2, time.Minute)

	// Different keys should have separate limits
	assert.True(t, limiter.Allow("key1"))
	assert.True(t, limiter.Allow("key1"))
	assert.False(t, limiter.Allow("key1")) // Blocked

	// key2 should still be allowed
	assert.True(t, limiter.Allow("key2"))
	assert.True(t, limiter.Allow("key2"))
	assert.False(t, limiter.Allow("key2")) // Blocked
}

func TestRateLimiter_WindowExpiration(t *testing.T) {
	// Create limiter with 100ms window for testing
	limiter := NewRateLimiter(2, 100*time.Millisecond)

	// Use up the limit
	assert.True(t, limiter.Allow("test-key"))
	assert.True(t, limiter.Allow("test-key"))
	assert.False(t, limiter.Allow("test-key")) // Blocked

	// Wait for window to expire
	time.Sleep(150 * time.Millisecond)

	// Should be allowed again after window expires
	assert.True(t, limiter.Allow("test-key"))
}

func TestRateLimit_Middleware(t *testing.T) {
	middleware := RateLimit(2, time.Minute)

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	// First 2 requests should succeed
	for i := 0; i < 2; i++ {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.RemoteAddr = "192.168.1.1:1234"
		rr := httptest.NewRecorder()

		middleware(handler).ServeHTTP(rr, req)
		assert.Equal(t, http.StatusOK, rr.Code, "Request %d should succeed", i+1)
	}

	// 3rd request should be rate limited
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "192.168.1.1:1234"
	rr := httptest.NewRecorder()

	middleware(handler).ServeHTTP(rr, req)
	assert.Equal(t, http.StatusTooManyRequests, rr.Code)
	assert.Contains(t, rr.Body.String(), "rate limit exceeded")
}

func TestRateLimit_Middleware_DifferentIPs(t *testing.T) {
	middleware := RateLimit(1, time.Minute)

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	// First IP uses its limit
	req1 := httptest.NewRequest(http.MethodGet, "/", nil)
	req1.RemoteAddr = "192.168.1.1:1234"
	rr1 := httptest.NewRecorder()
	middleware(handler).ServeHTTP(rr1, req1)
	assert.Equal(t, http.StatusOK, rr1.Code)

	// First IP blocked
	req2 := httptest.NewRequest(http.MethodGet, "/", nil)
	req2.RemoteAddr = "192.168.1.1:1234"
	rr2 := httptest.NewRecorder()
	middleware(handler).ServeHTTP(rr2, req2)
	assert.Equal(t, http.StatusTooManyRequests, rr2.Code)

	// Different IP should still be allowed
	req3 := httptest.NewRequest(http.MethodGet, "/", nil)
	req3.RemoteAddr = "192.168.1.2:1234"
	rr3 := httptest.NewRecorder()
	middleware(handler).ServeHTTP(rr3, req3)
	assert.Equal(t, http.StatusOK, rr3.Code)
}

func TestRateLimit_Middleware_XForwardedFor(t *testing.T) {
	middleware := RateLimit(1, time.Minute)

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	// Request with X-Forwarded-For header
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "10.0.0.1:1234" // Load balancer IP
	req.Header.Set("X-Forwarded-For", "203.0.113.1")
	rr := httptest.NewRecorder()

	middleware(handler).ServeHTTP(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)

	// Same client IP should be blocked
	req2 := httptest.NewRequest(http.MethodGet, "/", nil)
	req2.RemoteAddr = "10.0.0.1:1234"
	req2.Header.Set("X-Forwarded-For", "203.0.113.1")
	rr2 := httptest.NewRecorder()

	middleware(handler).ServeHTTP(rr2, req2)
	assert.Equal(t, http.StatusTooManyRequests, rr2.Code)
}
